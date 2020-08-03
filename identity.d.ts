import * as JsStore from "jsstore";
import { UIElements } from "./ui";
import * as Db from "./db";
export declare enum IdentityTypes {
    Guest = "guest",
    CreateId = "createid",
    ReuseId = "reuseid"
}
export declare class Identity {
    name: string;
    id: string;
    isEqual(other: Identity): boolean;
    initialize(name: string, id: string): void;
}
interface IdentityOutput {
    identity: Identity;
    pubKey: CryptoKey;
    pubKeyJWK: JsonWebKey;
    privKey: CryptoKey;
    privKeyJWK: JsonWebKey;
}
export declare function createIdentity(ui: UIElements, name: string): Promise<IdentityOutput>;
export interface IdColumn {
    id: string;
    name: string;
    pubKey: JsonWebKey;
    privKey: JsonWebKey | null;
    isSelf: string;
}
export declare const IdentityDBSchema: JsStore.ITable;
export interface IdentityQueryResult {
    ident: Identity;
    pubKeyJWK: JsonWebKey;
}
export interface IdDBInterface extends Db.DatabaseInterface {
    add: (ident: Identity, pubKey: JsonWebKey) => Promise<void>;
    get: (id: string) => Promise<IdentityQueryResult>;
    getGid: () => Promise<string | null>;
    getPubKey: (id: string) => Promise<CryptoKey>;
    getSelf: () => Promise<IdColumn | null>;
    getSelfPrivJWK: () => Promise<JsonWebKey>;
    getSelfPubJWK: () => Promise<JsonWebKey>;
    has: (id: string) => Promise<boolean>;
    insertUser: (user: IdColumn) => Promise<void>;
}
export declare class Database extends Db.Database implements IdDBInterface {
    schemas: JsStore.ITable[];
    suffix: string;
    _loaded_keys: Map<string, CryptoKey>;
    _self: IdColumn | null;
    getSelf(): Promise<IdColumn | null>;
    getGid(): Promise<string | null>;
    getSelfPubJWK(): Promise<JsonWebKey>;
    getSelfPrivJWK(): Promise<JsonWebKey>;
    get(id: string): Promise<IdentityQueryResult>;
    getPubKey(id: string): Promise<CryptoKey>;
    insertUser(user: IdColumn): Promise<void>;
    has(id: string): Promise<boolean>;
    add(ident: Identity, pubKey: JsonWebKey): Promise<void>;
}
export interface DatabaseConstructor {
    (conn: Db.JsDBConn | null, name: string): IdDBInterface;
}
export {};
