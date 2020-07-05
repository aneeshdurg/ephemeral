import { hash, sign, verify } from "./crypto";
import { Identity, IdentityCache } from "./identity";

export enum PostVerificationState {
    SUCCESS,
    FAILURE,
    PENDING,
}

export class Post {
    author: Identity = new Identity();
    contents: string = "";
    timestamp: number = 0;
    id: string = "";
    signature: Uint8Array | null = null;
    parent: string = "";

    constructor(ident: Identity, contents: string) {
        if (!ident) return;

        this.author = ident;
        this.contents = contents;
    }

    async initialize(privKey: CryptoKey | null) {
        this.timestamp = new Date().getTime();
        const author = this.author;
        const posthash = await hash(this.contents);
        this.id = `${author.name}@${author.id}:[${this.timestamp}]${posthash}`;

        if (privKey) this.signature = await sign(this.contents, privKey);
    }

    setParent(parentid: string) {
        this.parent = parentid;
    }

    fromJson(json: any) {
        this.author = new Identity();
        this.author.initialize(json["author"]["name"], json["author"]["id"]);
        this.contents = json["contents"];
        this.timestamp = json["timestamp"];
        this.id = json["id"];
        this.signature = json["signature"];
        this.parent = json["parent"];
    }

    isOwnedBy(identity: Identity): boolean {
        return this.author.isEqual(identity);
    }

    async verifyOwnership(
        knownIds: IdentityCache
    ): Promise<PostVerificationState> {
        if (this.author.id.startsWith("e'"))
            return PostVerificationState.SUCCESS;

        if (!this.signature) return PostVerificationState.FAILURE;

        if (!knownIds.has(this.author.id)) return PostVerificationState.PENDING;

        const pubkey = knownIds.users.get(this.author.id)!.publicKey;
        if (await verify(this.contents, this.signature, pubkey))
            return PostVerificationState.SUCCESS;
        return PostVerificationState.FAILURE;
    }
}

// TODO also enforce a max/min number of entries in the cache
// TODO get TTL from settings.json
const TTL = 1 * 60 * 60 * 1000;
export class PostCacheEntry {
    postid = "";
    timestamp = 0;
    constructor(postid: string, timestamp: number) {
        this.postid = postid;
        this.timestamp = timestamp;
    }
}

export class PostCache {
    name = "";
    postIds: PostCacheEntry[] = [];
    posts: Map<String, Post> = new Map(); // postId -> PostMessage
    _restored = false;

    constructor(name: string) {
        this.name = name;
        this._restored = false;
    }

    add(post: Post) {
        if (this.posts.has(post.id)) {
            return false;
        }

        this.postIds.push(new PostCacheEntry(post.id, new Date().getTime()));
        this.posts.set(post.id, post);
        return true;
    }

    remove(postid: string, ignoreIds?: boolean) {
        if (!this.has(postid)) return;

        this.posts.delete(postid);
        if (!ignoreIds)
            this.postIds.splice(
                this.postIds.findIndex((e) => e.postid == postid),
                1
            );
    }

    prune() {
        while (true) {
            const currentTime = new Date().getTime();
            if (
                this.postIds.length == 0 ||
                currentTime - this.postIds[0].timestamp < TTL
            )
                break;

            const entry = this.postIds.shift();
            this.remove(entry!.postid, true);
        }
    }

    has(id: string) {
        return this.posts.has(id);
    }

    storename() {
        return `PostCache[${this.name}]`;
    }

    async saveToStore(datastore: any) {
        if (!this._restored) return;
        await datastore.setItem(this.storename(), {
            postIds: this.postIds,
            posts: this.posts,
        });
    }

    async restoreFromStore(datastore: any) {
        try {
            const data = await datastore.getItem(this.storename());
            console.log("Restoring", this.storename());
            if (data) {
                data.postIds.forEach((entry: any) => {
                    this.postIds.push(
                        new PostCacheEntry(entry.postid, entry.timestamp)
                    );
                });

                console.log(data);
                data.posts.forEach((v: any, k: string) => {
                    const p = new Post(new Identity(), "");
                    p.fromJson(v);
                    this.posts.set(k, p);
                });
            }
        } catch {
            console.log("Restore failed, starting clean.");
            this.postIds = [];
            this.posts = new Map();
        }

        this._restored = true;
    }
}
