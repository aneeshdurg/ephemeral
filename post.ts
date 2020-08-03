import * as JsStore from "jsstore";

import { hash, sign, verify } from "./crypto";
import * as Id from "./identity";
import * as Db from "./db";

export enum PostVerificationState {
    SUCCESS,
    FAILURE,
    PENDING,
}

export interface PostDescriptor {
    id: string;
    timestamp: number;
}

export class Post {
    // TODO use PostDescriptor in here
    author: Id.Identity = new Id.Identity();
    contents: string = "";
    tags: string[] = [];
    timestamp: number = 0;
    id: string = "";
    parent: string = "";
    signature: Uint8Array | null = null;

    constructor(ident: Id.Identity, contents: string) {
        if (!ident) return;
        this.author = ident;
        this.setContents(contents);
    }

    setContents(contents: string) {
        this.contents = contents;

        // Extract tags from contents
        // https://stackoverflow.com/a/52713023/9802742
        const extractedTags = contents.match(/%[\p{L}\d]+/giu) || [];
        console.log(contents, extractedTags);
        this.tags = Array.from(extractedTags).map((s) => s.substr(1));
    }

    async sign(privKey: CryptoKey) {
        // TODO also sign the timestamp + parent
        this.signature = await sign(this.contents, privKey);

        // TODO maybe move timestamp setting somewhere else?
        this.timestamp = new Date().getTime();
    }

    async initialize(privKey: CryptoKey | null) {
        const author = this.author;
        const posthash = await hash(this.contents);
        this.id = `${author.name}@${author.id}:[${this.timestamp}]${posthash}`;

        if (privKey) await this.sign(privKey);
    }

    async update(newContents: string, privKey: CryptoKey) {
        this.setContents(newContents);
        await this.sign(privKey);
    }

    setParent(parentid: string) {
        this.parent = parentid;
    }

    fromJson(json: any) {
        this.author = new Id.Identity();
        this.author.initialize(json["author"]["name"], json["author"]["id"]);
        this.contents = json["contents"];
        this.tags = json["tags"];
        this.timestamp = json["timestamp"];
        this.id = json["id"];
        this.signature = json["signature"];
        this.parent = json["parent"];
    }

    isOwnedBy(identity: Id.Identity): boolean {
        return this.author.isEqual(identity);
    }

    async verifyOwnership(
        knownIds: Id.IdDBInterface
    ): Promise<PostVerificationState> {
        if (this.author.id.startsWith("e'"))
            return PostVerificationState.SUCCESS;

        if (!this.signature) return PostVerificationState.FAILURE;

        const authorIsKnown = await knownIds.has(this.author.id);
        if (!authorIsKnown) return PostVerificationState.PENDING;

        const pubkey = await knownIds.getPubKey(this.author.id);
        if (await verify(this.contents, this.signature, pubkey))
            return PostVerificationState.SUCCESS;
        return PostVerificationState.FAILURE;
    }
}

export interface PostColumn {
    id: string;
    authorId: string;
    authorName: string;
    contents: string;
    parentId: string;
    tags: string[];
    timestamp: number;
    signature: number[];
    addedTime: Date;
}

function convertPostColumnToPost(c: PostColumn): Post {
    const p = new Post(new Id.Identity(), "");
    p.fromJson({
        author: {
            id: c.authorId,
            name: c.authorName,
        },
        contents: c.contents,
        timestamp: c.timestamp,
        tags: c.tags,
        id: c.id,
        signature: c.signature.length == 0 ? null : new Uint8Array(c.signature),
        parent: c.parentId,
    });

    return p;
}

export const PostDBSchema: JsStore.ITable = {
    name: "PostCache",
    columns: {
        id: { primaryKey: true, dataType: JsStore.DATA_TYPE.String },
        authorId: { dataType: JsStore.DATA_TYPE.String },
        authorName: { dataType: JsStore.DATA_TYPE.String },
        contents: { dataType: JsStore.DATA_TYPE.String },
        parentId: { dataType: JsStore.DATA_TYPE.String },
        tags: { dataType: JsStore.DATA_TYPE.Array, multiEntry: true },
        timestamp: { dataType: JsStore.DATA_TYPE.Number },
        signature: { dataType: JsStore.DATA_TYPE.Array },
        addedTime: { dataType: JsStore.DATA_TYPE.DateTime },
    },
};

export const UnverifiedPostDBSchema: JsStore.ITable = {
    ...PostDBSchema,
    name: "UnverifiedPostCache",
};

export interface PostDBInterface extends Db.DatabaseInterface {
    add: (post: Post) => Promise<boolean>;
    remove: (postid: string) => Promise<void>;
    prune: () => Promise<void>;
    has: (id: string) => Promise<PostDescriptor | null>;
    get: (id: string) => Promise<Post>;
    getAllPostDescriptors: () => Promise<PostDescriptor[]>;
}

export class Database extends Db.Database implements PostDBInterface {
    postCache: string = "";
    schemas: JsStore.ITable[] = [PostDBSchema, UnverifiedPostDBSchema];
    suffix: string = "postCache";
    // TODO also enforce a max/min number of entries in the cache
    // TODO get TTL from settings.json
    TTL = 1 * 60 * 60 * 1000;

    async add(post: Post): Promise<boolean> {
        if (await this.has(post.id)) return false;

        await this.conn.insert({
            into: this.postCache,
            values: [
                {
                    id: post.id,
                    authorId: post.author.id,
                    authorName: post.author.name,
                    contents: post.contents,
                    parentId: post.parent,
                    tags: post.tags,
                    timestamp: post.timestamp,
                    signature: Array.from(post.signature || []),
                    addedTime: new Date(),
                },
            ],
        });
        return true;
    }

    async remove(postid: string): Promise<void> {
        this.conn.remove({
            from: this.postCache,
            where: { id: postid },
        });
    }

    async prune(): Promise<void> {
        // TODO Should posts made by the self user have a longer or infinite
        // TTL?
        const expiryTime = new Date();
        // go back TTL ms
        expiryTime.setTime(expiryTime.getTime() - this.TTL);

        this.conn.remove({
            from: this.postCache,
            where: {
                timestamp: {
                    "<": expiryTime,
                },
            },
        });
    }

    async has(id: string): Promise<PostDescriptor | null> {
        const queryResult = await this.conn.select({
            from: this.postCache,
            where: { id: id },
        });
        if (queryResult.length == 0)
            return null;

        return ({
            id: id,
            timestamp: (queryResult[0] as PostColumn).timestamp
        } as PostDescriptor);
    }

    async get(id: string): Promise<Post> {
        const queryResult = await this.conn.select({
            from: this.postCache,
            where: { id: id },
        });
        if (queryResult.length == 0)
            throw new Error(`Post with id ${id} not found!`);

        return convertPostColumnToPost(queryResult[0] as PostColumn);
    }

    async getAllPostDescriptors(): Promise<PostDescriptor[]> {
        const postIds = [];
        const posts = await this.conn.select({ from: this.postCache });
        for (let post_ of posts) {
            const post = post_ as PostColumn;
            postIds.push(
                {id: post.id, timestamp: post.timestamp} as PostDescriptor
            );
        }
        return postIds;
    }
}

export class PostDB extends Database {
    postCache: string = PostDBSchema.name;

    constructor(db: PostDBInterface) {
        // These cast are always assumed to be valid
        super((db as Database).conn, (db as Database).dbname);
    }
}

export class UnverifiedPostDB extends PostDB {
    postCache: string = UnverifiedPostDBSchema.name;
}

export interface DatabaseConstructor {
    (conn: Db.JsDBConn | null, name: string): PostDBInterface;
}

export interface PostDatabaseConstructor {
    (db: PostDBInterface): PostDBInterface;
}
