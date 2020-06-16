export class Identity {
    name = "";
    id = "";

    initialize(name, id) {
        this.name = name;
        this.id = id;
    }
}

export class PersistantIdentity {
    name = "";
    id = "";
    publicKey = {};

    constructor(name, gid, publicKey) {
        this.name = name;
        this.gid = gid;
        this.publicKey = publicKey;
    }
};

// ID cache

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
    postIds = [];
    posts = new Map(); // postId -> PostMessage

    add(post) {
        if (this.posts.has(post.id)) {
            return false;
        }

        this.postIds.push(new CacheEntry(post.id, (new Date()).getTime()));
        this.posts.set(post.id, post);
        return true;
    }

    prune() {
        while (true) {
            const currentTime = (new Date()).getTime();
            if (this.postIds.length == 0 || (currentTime - this.postIds[0].timestamp) < TTL)
                break;

            this.postIds.shift();
        }
    }

    has(id) {
        return this.posts.has(id);
    }
}

export const MessageTypes = {
    POST: "post",
    QUERYPOSTS: "queryposts", // TODO
    QUERYPOSTSRESP: "querypostsresp", // TODO
    REQUESTPOSTS: "requestposts", // TODO
    QUERYUSERS: "queryusers", // TODO
    REQUESTUSER: "requestuser", // TODO
    HEARTBEAT: "heartbeat", // TODO
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
