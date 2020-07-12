import * as JsStore from 'jsstore';

import { hash, generateKeys, loadPubKey } from "./crypto";
import { UIElements } from "./ui";
import * as Db from "./db";

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

export interface IdColumn {
    id: string;
    name: string;
    pubKey: JsonWebKey;
    privKey: JsonWebKey | null;
    isSelf: string;
}

export const IdentityDBSchema: JsStore.ITable = {
    name: "IdCache",
    columns: {
        id: { primaryKey: true, dataType: JsStore.DATA_TYPE.String },
        name: {dataType: JsStore.DATA_TYPE.String },
        pubKey: {dataType: JsStore.DATA_TYPE.Object },
        privKey: {dataType: JsStore.DATA_TYPE.Object},
        isSelf: {dataType: JsStore.DATA_TYPE.String, default: false},
        timestamp: {dataType: JsStore.DATA_TYPE.DateTime },
    }
}

interface IdentityQueryResult {
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

export class Database extends Db.Database implements IdDBInterface {
    schemas: JsStore.ITable[] = [IdentityDBSchema];
    suffix: string = "ident";

    _loaded_keys: Map<string, CryptoKey> = new Map();

    async getSelf(): Promise<IdColumn | null> {
        // TODO cache the result of this query
        const entries = await this.conn.select({
            from: IdentityDBSchema.name, where: { isSelf: "true" }
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

    async getSelfPubJWK(): Promise<JsonWebKey> {
        const self_ = await this.getSelf();
        if (!self_)
            throw new Error("Could not find self!");

        return self_.pubKey;
    }

    async getSelfPrivJWK(): Promise<JsonWebKey> {
       const self_ = await this.getSelf();
       if (!self_)
            throw new Error("Could not find self!");

        return self_.privKey!;
    }

    async getPubKey(id: string): Promise<CryptoKey> {
        if (!this._loaded_keys.has(id)) {
            const queryResult = await this.conn.select({
                from: IdentityDBSchema.name, where: { id: id }
            });
            if (queryResult.length == 0)
                throw new Error(`Could not find ident with id ${id}!`);

            const result = queryResult[0] as IdColumn;
            const pubKey = await loadPubKey(result.pubKey);
            this._loaded_keys.set(id, pubKey);
            return pubKey;
        }

        return this._loaded_keys.get(id)!;
    }

    async get(id: string): Promise<IdentityQueryResult> {
        const queryResult = await this.conn.select({
            from: IdentityDBSchema.name, where: { id: id }
        });
        if (queryResult.length == 0)
            throw new Error(`Could not find ident with id ${id}!`);

        const result = queryResult[0] as IdColumn;
        const ident = new Identity();
        ident.initialize(result.name, result.id);
        return {
            ident: ident,
            pubKeyJWK: result.pubKey
        };
    }

    async insertUser(user: IdColumn): Promise<void> {
        // upsert will insert if the user is not present, and will update
        // otherwise
        await this.conn.insert({
            into: IdentityDBSchema.name,
            upsert: true,
            values: [{
                ...user,
                timestamp: new Date(),
            }],
        });
    }

    async has(id: string): Promise<boolean> {
        const queryResult = await this.conn.select({
            from: IdentityDBSchema.name, where: { id: id }
        });
        return queryResult.length == 1;
    }

    async add(ident: Identity, pubKey: JsonWebKey): Promise<void> {
        await this.insertUser({
            id: ident.id,
            name: ident.name,
            pubKey: pubKey,
            privKey: null,
            isSelf: "false",
        });
    }
}

export interface DatabaseConstructor {
    new (conn: Db.JsDBConn | null, name: string): IdDBInterface;
}
