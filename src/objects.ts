export class Identity {
    name = "";
    id = "";

    initialize(name: string, id: string) {
        this.name = name;
        this.id = id;
    }
}

class IdentityCacheEntry {
    ident: Identity;
    publicKey: any;

    constructor(ident: Identity, publicKey: any) {
        this.ident = ident;
        this.publicKey = publicKey;
    }
}
export class IdentityCache {
    users: Map<string, IdentityCacheEntry> = new Map(); // id -> (name, pubkey)

    // TODO eventually we'll probably want to expire the entries for ids
    // TODO add type for Crypto.key
    add(ident: Identity, pubkey: Object) {
        if (this.has(ident.id)) return false;
        this.users.set(ident.id, new IdentityCacheEntry(ident, pubkey));
        return true;
    }

    has(id: string) {
        return this.users.has(id);
    }

    saveToStore(_datastore: any) {
        // TODO
    }
}

// https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest
export async function digestMessage(message: string) {
    const msgUint8 = new TextEncoder().encode(message); // encode as (utf-8) Uint8Array
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8); // hash the message
    const hashArray = Array.from(new Uint8Array(hashBuffer)); // convert buffer to byte array
    return hashArray;
}

function padStart(input: string, count: number, char: string) {
    while (input.length < count) {
        input = char + input;
    }
    return input;
}

export function byteArrayToHexStr(hashArray: number[]) {
    const hashHex = hashArray
        .map((b) => padStart(b.toString(16), 2, "0"))
        .join(""); // convert bytes to hex string
    return hashHex;
}

export function byteArrayToB32Str(hashArray: number[]) {
    let hashHex = "";
    if (hashArray.length % 2 == 1) hashArray.push(0);
    for (let i = 0; i < hashArray.length; i += 2) {
        hashHex += padStart(
            (hashArray[i] * 256 + hashArray[i + 1]).toString(32),
            2,
            "0"
        );
    }
    return hashHex;
}

export class Post {
    author: Identity = new Identity();
    contents: string = "";
    timestamp: number = 0;
    id: string = "";

    constructor(ident: Identity, contents: string) {
        if (!ident) return;

        this.author = ident;
        this.contents = contents;
    }

    async initialize() {
        this.timestamp = new Date().getTime();
        const hash = byteArrayToHexStr(await digestMessage(this.contents));
        this.id = `${this.author.name}@${this.author.id}:[${this.timestamp}]${hash}`;
    }

    fromJson(json: any) {
        this.author = new Identity();
        this.author.initialize(json["author"]["name"], json["author"]["id"]);
        this.contents = json["contents"];
        this.timestamp = json["timestamp"];
        this.id = json["id"];
    }
}

// TODO also enforce a max/min number of entries in the cache
const TTL = 1 * 60 * 60 * 1000;
class PostCacheEntry {
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

export enum MessageTypes {
    _INVALID = "",
    //post msgs
    POST = "post",
    QUERYPOSTS = "queryposts",
    QUERYPOSTSRESP = "querypostsresp",
    REQUESTPOSTS = "requestposts",
    //identity msgs
    QUERYIDENT = "queryident",
    QUERYIDENTRESP = "queryidentresp",
}

export class Message {
    type: MessageTypes = MessageTypes._INVALID;
}

export class PostMessage extends Message {
    type = MessageTypes.POST;
    post: Post;

    constructor(post: Post) {
        super();
        this.post = post;
    }
}

export class QueryPostMessage extends Message {
    type = MessageTypes.QUERYPOSTS;
    // TODO include start range and end range
}

export class QueryPostRespMessage extends Message {
    type = MessageTypes.QUERYPOSTSRESP;
    posts: PostCacheEntry[];

    constructor(posts: PostCacheEntry[]) {
        super();
        this.posts = posts;
    }
}

export class RequestPostMessage extends Message {
    type = MessageTypes.REQUESTPOSTS;
    postid: string;

    constructor(postid: string) {
        super();
        this.postid = postid;
    }
}

export class QueryIdentRespMessage extends Message {
    type = MessageTypes.QUERYIDENTRESP;
    ident: Identity; // Identity
    publicKey: Object; // public key in jwk format

    constructor(ident: Identity, publickey: Object) {
        super();
        this.ident = ident;
        this.publicKey = publickey;
    }
}

export class QueryIdentMessage extends Message {
    type = MessageTypes.QUERYIDENT;
    id: string;

    constructor(id: string) {
        super();
        this.id = id;
    }
}
