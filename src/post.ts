import * as JsStore from "jsstore";

import { hash, sign, verify } from "./crypto";
import * as Id from "./identity";
import * as Db from "./db";

export enum PostVerificationState {
    SUCCESS,
    FAILURE,
    PENDING,
}

export class Post {
    author: Id.Identity = new Id.Identity();
    contents: string = "";
    timestamp: number = 0;
    id: string = "";
    signature: Uint8Array | null = null;
    parent: string = "";

    constructor(ident: Id.Identity, contents: string) {
        if (!ident) return;

        this.author = ident;
        this.contents = contents;
    }

    async initialize(privKey: CryptoKey | null) {
        this.timestamp = new Date().getTime();
        const author = this.author;
        const posthash = await hash(this.contents);
        this.id = `${author.name}@${author.id}:[${this.timestamp}]${posthash}`;

        // TODO also sign the timestamp
        if (privKey) this.signature = await sign(this.contents, privKey);
    }

    setParent(parentid: string) {
        this.parent = parentid;
    }

    fromJson(json: any) {
        this.author = new Id.Identity();
        this.author.initialize(json["author"]["name"], json["author"]["id"]);
        this.contents = json["contents"];
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

// TODO also enforce a max/min number of entries in the cache
// TODO get TTL from settings.json
// const TTL = 1 * 60 * 60 * 1000;

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
    has: (id: string) => Promise<boolean>;
    get: (id: string) => Promise<Post>;
    getAllPostIds: () => Promise<string[]>;
}

export class Database extends Db.Database implements PostDBInterface {
    postCache: string = "";
    schemas: JsStore.ITable[] = [PostDBSchema, UnverifiedPostDBSchema];
    suffix: string = "postCache";

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
                    tags: [],
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
        // TODO use JsStore queries to remove entries matching a certain time
        // range [currentTime - TTL, currentTime)?
        // Should posts made by the self user have a longer or infinite TTL?
    }

    async has(id: string): Promise<boolean> {
        const queryResult = await this.conn.select({
            from: this.postCache,
            where: { id: id },
        });
        return queryResult.length == 1;
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

    async getAllPostIds(): Promise<string[]> {
        const postIds = [];
        const posts = await this.conn.select({ from: this.postCache });
        for (let post_ of posts) {
            const post = post_ as PostColumn;
            postIds.push(post.id);
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
