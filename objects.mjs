export class Identity {
    name = "";
    id = "";

    initialize(name, id) {
        this.name = name;
        this.id = id;
    }
}

export class IdentityCache {
    users = new Map(); // id -> (name, pubkey)

    // TODO eventually we'll probably want to expire the entries for ids

    add(ident, pubkey) {
        if (this.has(ident.id))
            return false;
        this.users.set(ident.id, {
            ident: ident,
            publicKey: pubkey
        });
        return true;
    }

    has(id) {
        return this.users.has(id);
    }

    saveToStore(datastore) {
        // TODO
    }
}

// https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest
export async function digestMessage(message) {
      const msgUint8 = new TextEncoder().encode(message);                           // encode as (utf-8) Uint8Array
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);           // hash the message
      const hashArray = Array.from(new Uint8Array(hashBuffer));                     // convert buffer to byte array
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join(''); // convert bytes to hex string
      return hashHex;
}

export class Post {
    author = null;
    contents = "";
    timestamp = 0;
    id = "";

    constructor(ident, contents) {
        if (!ident)
            return;

        this.author = ident;
        this.contents = contents;
    }

    async initialize() {
        this.timestamp = (new Date()).getTime();
        const hash = await digestMessage(this.contents);
        this.id = `${this.author.name}@${this.author.id}:[${this.timestamp}]${hash}`;
    }

    fromJson(json) {
        Object.keys(this).forEach(key => {
            this[key] = json[key];
        });
    }
}

// TODO also enforce a max/min number of entries in the cache
const TTL = 1 * 60 * 60 * 1000;
class CacheEntry {
    postid = ""
    timestamp = 0
    constructor(postid, timestamp) {
        this.postid = postid;
        this.timestamp = timestamp;
    }
}

export class PostCache {
    name = "";
    postIds = [];
    posts = new Map(); // postId -> PostMessage

    constructor(name) {
        this.name = name;
        this._restored = false;
    }

    add(post) {
        if (this.posts.has(post.id)) {
            return false;
        }

        this.postIds.push(new CacheEntry(post.id, (new Date()).getTime()));
        this.posts.set(post.id, post);
        return true;
    }

    remove(postid, ignoreIds) {
        if (!this.has(postid))
            return;

        this.posts.delete(postid);
        if (!ignoreIds)
            this.postIds.splice(this.postIds.findIndex(e => e.postid == postid), 1);
    }

    prune() {
        while (true) {
            const currentTime = (new Date()).getTime();
            if (this.postIds.length == 0 || (currentTime - this.postIds[0].timestamp) < TTL)
                break;

            const entry = this.postIds.shift();
            this.posts.remove(entry, true);
        }
    }

    has(id) {
        return this.posts.has(id);
    }

    storename() {
        return `PostCache[${this.name}]`;
    }

    async saveToStore(datastore) {
        if (!this._restored)
            return;
        await datastore.setItem(this.storename(), {
            postIds: this.postIds,
            posts: this.posts,
        });
    }

    async restoreFromStore(datastore) {
        const data = await datastore.getItem(this.storename());
        console.log("Restoring", this.storename());
        if (data) {
            data.postIds.forEach(entry => {
                this.postIds.push(new CacheEntry(entry.postid, entry.timestamp));
            });

            data.posts.forEach((v, k) => {
                const p = new Post();
                p.fromJson(v);
                this.posts.set(k, p);
            });
        }

        this._restored = true;
    }
}

export const MessageTypes = {
    //post msgs
    POST: "post",
    QUERYPOSTS: "queryposts",
    QUERYPOSTSRESP: "querypostsresp",
    REQUESTPOSTS: "requestposts",
    //identity msgs
    QUERYIDENT: "queryident",
    QUERYIDENTRESP: "queryidentresp",
}

export class Message {
    type = "";
}

export class PostMessage extends Message {
    type = MessageTypes.POST;
    post = null;

    constructor(post) {
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
    posts = []; // postIds

    constructor(posts) {
        super();
        this.posts = posts;
    }
}

export class RequestPostMessage extends Message {
    type = MessageTypes.REQUESTPOSTS;
    postid = ""; // postidIds

    constructor(postid) {
        super();
        this.postid = postid;
    }
}

export class QueryIdentRespMessage extends Message {
    type = MessageTypes.QUERYIDENTRESP;
    ident = {}; // Identity
    publicKey = {}; // public key in jwk format

    constructor(ident, publickey) {
        super();
        this.ident = ident;
        this.publicKey = publickey;
    }
}

export class QueryIdentMessage extends Message {
    type = MessageTypes.QUERYIDENT;
    id = "";

    constructor(id) {
        super();
        this.id = id;
    }
}

