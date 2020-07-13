import * as JsStore from "jsstore";
import * as Id from "./identity";
import * as Db from "./db";
export declare enum PostVerificationState {
    SUCCESS = 0,
    FAILURE = 1,
    PENDING = 2
}
export declare class Post {
    author: Id.Identity;
    contents: string;
    timestamp: number;
    id: string;
    signature: Uint8Array | null;
    parent: string;
    constructor(ident: Id.Identity, contents: string);
    initialize(privKey: CryptoKey | null): Promise<void>;
    setParent(parentid: string): void;
    fromJson(json: any): void;
    isOwnedBy(identity: Id.Identity): boolean;
    verifyOwnership(knownIds: Id.IdDBInterface): Promise<PostVerificationState>;
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
export declare const PostDBSchema: JsStore.ITable;
export declare const UnverifiedPostDBSchema: JsStore.ITable;
export interface PostDBInterface extends Db.DatabaseInterface {
    add: (post: Post) => Promise<boolean>;
    remove: (postid: string) => Promise<void>;
    prune: () => Promise<void>;
    has: (id: string) => Promise<boolean>;
    get: (id: string) => Promise<Post>;
    getAllPostIds: () => Promise<string[]>;
}
export declare class Database extends Db.Database implements PostDBInterface {
    postCache: string;
    schemas: JsStore.ITable[];
    suffix: string;
    add(post: Post): Promise<boolean>;
    remove(postid: string): Promise<void>;
    prune(): Promise<void>;
    has(id: string): Promise<boolean>;
    get(id: string): Promise<Post>;
    getAllPostIds(): Promise<string[]>;
}
export declare class PostDB extends Database {
    postCache: string;
    constructor(db: PostDBInterface);
}
export declare class UnverifiedPostDB extends PostDB {
    postCache: string;
}
export interface DatabaseConstructor {
    (conn: Db.JsDBConn | null, name: string): PostDBInterface;
}
export interface PostDatabaseConstructor {
    (db: PostDBInterface): PostDBInterface;
}
