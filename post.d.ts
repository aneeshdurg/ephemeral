import { Identity, IdentityCache } from "./identity";
export declare enum PostVerificationState {
    SUCCESS = 0,
    FAILURE = 1,
    PENDING = 2
}
export declare class Post {
    author: Identity;
    contents: string;
    timestamp: number;
    id: string;
    signature: Uint8Array | null;
    parent: string;
    constructor(ident: Identity, contents: string);
    initialize(privKey: CryptoKey | null): Promise<void>;
    setParent(parentid: string): void;
    fromJson(json: any): void;
    isOwnedBy(identity: Identity): boolean;
    verifyOwnership(knownIds: IdentityCache): Promise<PostVerificationState>;
}
export declare class PostCacheEntry {
    postid: string;
    timestamp: number;
    constructor(postid: string, timestamp: number);
}
export declare class PostCache {
    name: string;
    postIds: PostCacheEntry[];
    posts: Map<String, Post>;
    _restored: boolean;
    constructor(name: string);
    add(post: Post): boolean;
    remove(postid: string, ignoreIds?: boolean): void;
    prune(): void;
    has(id: string): boolean;
    storename(): string;
    saveToStore(datastore: any): Promise<void>;
    restoreFromStore(datastore: any): Promise<void>;
}
