import * as JsStore from 'jsstore';

import { hash, generateKeys } from "./crypto";
import { UIElements } from "./ui";
import * as db from "./db";

export enum IdentityTypes {
    Guest = "guest",
    CreateId = "createid",
    ReuseId = "reuseid",
}

export class Identity {
    name = "";
    id = "";

    isEqual(other: Identity): boolean {
        return this.id === other.id;
    }

    initialize(name: string, id: string) {
        this.name = name;
        this.id = id;
    }
}

interface IdentityOutput {
    identity: Identity;
    pubKey: CryptoKey;
    pubKeyJWK: JsonWebKey;
    privKey: CryptoKey;
    privKeyJWK: JsonWebKey;
}

export async function createIdentity(
    ui: UIElements,
    name: string
): Promise<IdentityOutput> {
    ui.logToConsole("Creating new identity.");
    ui.logToConsole("Generating RSA keys.");
    const keys = await generateKeys();
    ui.logToConsole("Done generating RSA keys.");

    const privKey = keys.privateKey;
    const privKeyJWK = await crypto.subtle.exportKey("jwk", privKey);
    delete privKeyJWK["key_ops"];

    const pubKey = keys.publicKey;
    const pubKeyJWK = await crypto.subtle.exportKey("jwk", pubKey);
    delete pubKeyJWK["key_ops"];

    const globalID = await hash(<string>pubKeyJWK.n);
    ui.logToConsole(`Global ID: ${globalID}`);

    const ident = new Identity();
    ident.initialize(name, globalID);
    ui.logToConsole(`Created ID:<br><b>${name}</b>@${globalID}`);

    return {
        identity: ident,
        pubKey: pubKey,
        pubKeyJWK: pubKeyJWK,
        privKey: privKey,
        privKeyJWK: privKeyJWK,
    };
}

interface IdentityCacheEntry {
    ident: Identity;
    publicKey: CryptoKey;
}

export class IdentityCache {
    users: Map<string, IdentityCacheEntry> = new Map(); // id -> (name, pubkey)
    _restored: boolean = false;

    // TODO eventually we'll probably want to expire the entries for ids
    add(ident: Identity, pubkey: CryptoKey) {
        if (this.has(ident.id)) return false;
        this.users.set(ident.id, { ident: ident, publicKey: pubkey });
        return true;
    }

    has(id: string) {
        return this.users.has(id);
    }

}

export interface IdColumn {
    id: string;
    name: string;
    pubKey: JsonWebKey;
    privKey: JsonWebKey | null;
    isSelf: boolean;
}

export const IdentityDBSchema: JsStore.ITable = {
    name: db.TableNames.IdCache,
    columns: {
        id: { primaryKey: true, dataType: JsStore.DATA_TYPE.String },
        name: {dataType: JsStore.DATA_TYPE.String },
        pubkey: {dataType: JsStore.DATA_TYPE.Object },
        privKey: {dataType: JsStore.DATA_TYPE.Object},
        isSelf: {dataType: JsStore.DATA_TYPE.Boolean, default: false},
        timestamp: {dataType: JsStore.DATA_TYPE.DateTime },
    }
}

export class Database extends db.Database{
    schemas: ITable[] = [IdentityDBSchema];

    async getSelf(): Promise<IdColumn | null> {
        const entries = await this.conn.select({
            from: IdentityDBSchema.name, where: { isSelf: true }
        });
        if (entries.length == 0)
            return null;

        return (entries[0] as IdColumn);
    }

    async getGid(): Promise<string | null> {
        const self_ = await this.getSelf();
        if (!self_)
            return null;

        return self_.id;
    }

    async getPubKey(): Promise<JsonWebKey> {
       const self_ = await this.getSelf();
       if (!self_)
            throw new Error("Could not find self!");

        return self_.pubKey;
    }

    async getPrivKey(): Promise<JsonWebKey> {
       const self_ = await this.getSelf();
       if (!self_)
            throw new Error("Could not find self!");

        return self_.privKey!;
    }

    async insertUser(user: IdColumn): Promise<void> {
        // upsert will insert if the user is not present, and will update
        // otherwise
        this.conn.insert({
            into: IdentityDBSchema.name,
            upsert: true,
            values: [{
                ...user,
                timestamp: new Date(),
            }],
        });
    }

    async has(id: string): Promise<boolean> {
    }

    async add(id: string, pubKey: JsonWebKey): Promise<void> {
        this.insertUser({
            id: id,
            name: "???", // TODO
            pubKey: pubKey,
            privKey: null,
            isSelf: boolean,
        });
    }
}
