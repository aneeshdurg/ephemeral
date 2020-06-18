import { UIElements } from "./ui";
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
interface IdentityCacheEntry {
    ident: Identity;
    publicKey: CryptoKey;
}
export declare class IdentityCache {
    users: Map<string, IdentityCacheEntry>;
    _restored: boolean;
    add(ident: Identity, pubkey: CryptoKey): boolean;
    has(id: string): boolean;
    storename(): string;
    saveToStore(datastore: any): Promise<void>;
    restoreFromStore(datastore: any): Promise<void>;
}
export {};
