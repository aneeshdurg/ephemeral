import * as JsStore from "jsstore";
import * as Id from "./identity";
import * as Db from "./db";
export declare enum PostVerificationState {
    SUCCESS = 0,
    FAILURE = 1,
    PENDING = 2
}
export interface PostDescriptor {
    id: string;
    timestamp: number;
}
export declare class Post {
    author: Id.Identity;
    contents: string;
    tags: string[];
    desc: PostDescriptor;
    parent: string;
    signature: Uint8Array | null;
    constructor(ident: Id.Identity, contents: string);
    setContents(contents: string): void;
    sign(privKey: CryptoKey): Promise<void>;
    initialize(privKey: CryptoKey | null): Promise<void>;
    update(newContents: string, privKey: CryptoKey): Promise<void>;
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
    has: (id: string) => Promise<PostDescriptor | null>;
    get: (id: string) => Promise<Post>;
    getAllPostDescriptors: (after?: Date | null) => Promise<PostDescriptor[]>;
}
export declare class Database extends Db.Database implements PostDBInterface {
    postCache: string;
    schemas: JsStore.ITable[];
    suffix: string;
    TTL: number;
    add(post: Post): Promise<boolean>;
    remove(postid: string): Promise<void>;
    prune(): Promise<void>;
    has(id: string): Promise<PostDescriptor | null>;
    get(id: string): Promise<Post>;
    getAllPostDescriptors(after?: Date | null): Promise<PostDescriptor[]>;
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
