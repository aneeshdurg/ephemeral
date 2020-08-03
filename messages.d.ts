import { Identity } from "./identity";
import { Post, PostDescriptor } from "./post";
export declare enum MessageTypes {
    _INVALID = "",
    POST = "post",
    QUERYPOSTS = "queryposts",
    QUERYPOSTSRESP = "querypostsresp",
    REQUESTPOSTS = "requestposts",
    QUERYIDENT = "queryident",
    QUERYIDENTRESP = "queryidentresp"
}
export declare class Message {
    type: MessageTypes;
}
export declare class PostMessage extends Message {
    type: MessageTypes;
    post: Post;
    constructor(post: Post);
}
export declare class QueryPostMessage extends Message {
    type: MessageTypes;
}
export declare class QueryPostRespMessage extends Message {
    type: MessageTypes;
    posts: PostDescriptor[];
    constructor(posts: PostDescriptor[]);
}
export declare class RequestPostMessage extends Message {
    type: MessageTypes;
    postid: string;
    constructor(postid: string);
}
export declare class QueryIdentRespMessage extends Message {
    type: MessageTypes;
    ident: Identity;
    publicKey: Object;
    constructor(ident: Identity, publickey: Object);
}
export declare class QueryIdentMessage extends Message {
    type: MessageTypes;
    id: string;
    constructor(id: string);
}
