import { Identity } from "./identity";
import { Post, PostCacheEntry } from "./post";

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
