import * as JsStore from "jsstore";

import * as settings from "../settings.json";
import { Client, Settings } from "../client";
import { UIElements, UIElementsArgs } from "../ui";
import { IdentityTypes } from "../identity";
import { TestSuite } from "./testLib";
import * as Db from "../db";
import * as Id from "../identity";
import * as Post from "../post";
import { loadPubKey } from "../crypto";

class MockUI {
    uiArgs: UIElementsArgs;
    ui: UIElements;
    recordedCalls: Map<string, Array<any>> = new Map();
    console: HTMLDivElement;

    constructor() {
        this.console = document.createElement("div") as HTMLDivElement;
        const that = this;
        const record = (name: string, retval: any) =>
            that.recordCall.bind(that, name, retval);
        this.uiArgs = {
            renderPost: record("renderPost", true),
            updateConns: record("updateConns", null),
            updateIdent: record("updateIdent", null),
            enableConsoleMode: record("enableConsoleMode", null),
            disableConsoleMode: record("disableConsoleMode", null),
            console: this.console,
            returnToIndex: record("returnToIndex", null),
            raiseConfirmDelete: record("raiseConfirmDelete", false),
            raiseAlert: record("raiseAlert", null),
        };
        this.ui = new UIElements(this.uiArgs);
    }

    recordCall(name: string, retval: any, ...args: Array<any>): any {
        if (!this.recordedCalls.has(name)) this.recordedCalls.set(name, []);
        const calls = this.recordedCalls.get(name)!;
        calls.push(args);

        return retval;
    }
}

class MockStorage implements Storage {
    storage: Map<string, any> = new Map();

    clear() {
        this.storage = new Map();
    }

    getItem(key: string) {
        return this.storage.get(key) || null;
    }

    setItem(key: string, value: any) {
        return this.storage.set(key, value);
    }

    removeItem(key: string) {
        this.storage.delete(key);
    }

    key(n: number) {
        return Array.from(this.storage.keys())[n];
    }

    get length() {
        return this.storage.size;
    }
}

class MockUserDB implements Id.IdDBInterface {
    name: string = "";
    entries: Map<string, Id.IdentityQueryResult> = new Map();

    _self: {
        ident: Id.Identity;
        pubKey: JsonWebKey;
        privKey: JsonWebKey;
    } | null = null;
    get self() {
        return this._self!;
    }

    async add(ident: Id.Identity, pubKey: JsonWebKey): Promise<void> {
        this.entries.set(ident.id, { ident: ident, pubKeyJWK: pubKey });
    }

    async get(id: string): Promise<Id.IdentityQueryResult> {
        return this.entries.get(id)!;
    }

    async getGid(): Promise<string | null> {
        if (this._self === null) return null;
        return this.self.ident.id;
    }

    async getPubKey(id: string): Promise<CryptoKey> {
        const result = await this.get(id);
        const pubKey = await loadPubKey(result.pubKeyJWK);
        return pubKey;
    }

    async getSelf(): Promise<Id.IdColumn | null> {
        return {
            id: this.self.ident.id,
            name: this.self.ident.name,
            pubKey: this.self.pubKey,
            privKey: this.self.privKey,
            isSelf: "true",
        };
    }

    async getSelfPrivJWK(): Promise<JsonWebKey> {
        return this.self.privKey;
    }

    async getSelfPubJWK(): Promise<JsonWebKey> {
        return this.self.pubKey;
    }

    async has(id: string): Promise<boolean> {
        return this.entries.has(id);
    }

    async insertUser(user: Id.IdColumn): Promise<void> {
        const ident = new Id.Identity();
        ident.initialize(user.name, user.id);

        if (user.isSelf === "true") {
            this._self = {
                ident: ident,
                pubKey: user.pubKey,
                privKey: user.privKey!,
            };
        } else {
            this.entries.set(ident.id, {
                ident: ident,
                pubKeyJWK: user.pubKey,
            });
        }
    }

    async initialize(): Promise<boolean> {
        return true;
    }

    clear() {
        this.entries = new Map();
        this._self = null;
    }
}

class MockPostDBBase implements Post.PostDBInterface {
    name: string = "";
    entries: Map<string, Post.Post> = new Map();

    async add(post: Post.Post): Promise<boolean> {
        if (await this.has(post.id)) return false;

        this.entries.set(post.id, post);
        return true;
    }

    async remove(postid: string): Promise<void> {
        this.entries.delete(postid);
    }

    async prune(): Promise<void> {}

    async has(id: string): Promise<boolean> {
        return this.entries.has(id);
    }

    async get(id: string): Promise<Post.Post> {
        return this.entries.get(id)!;
    }

    async getAllPostIds(): Promise<string[]> {
        return Array.from(this.entries.keys());
    }

    async initialize(): Promise<boolean> {
        return true;
    }

    async clear() {
        this.entries = new Map();
    }
}

class MockVerifiedPostDB extends MockPostDBBase {}

class MockUnverifiedPostDB extends MockVerifiedPostDB {}

interface MockedClient {
    mockUI: MockUI;
    client: Client;
    settings: Settings;
    storage: MockStorage;
    userDB: MockUserDB;
    postDB: MockPostDBBase;
    verifiedPostDB: MockVerifiedPostDB;
    unverifiedPostDB: MockUnverifiedPostDB;
}

function newMockedClient(
    newSettings: any,
    name: string,
    idmgmt: IdentityTypes
): MockedClient {
    const finalSettings = { ...settings };
    Object.keys(newSettings).forEach((key_) => {
        const key = key_ as keyof Settings;
        if (typeof finalSettings[key] === "object") {
            finalSettings[key] = {
                ...(finalSettings[key] as object),
                ...(newSettings[key] as object),
            } as any;
        } else {
            finalSettings[key] = newSettings[key];
        }
    });

    console.log("settings:", JSON.stringify(finalSettings));

    const mockUI = new MockUI();
    const mockSessionStorage = new MockStorage();
    mockSessionStorage.setItem("name", name);
    mockSessionStorage.setItem("idmgmt", idmgmt);

    // TODO return the userDB obj
    const userDB = new MockUserDB();
    const postDB = new MockPostDBBase();
    const verifiedPostDB = new MockVerifiedPostDB();
    const unverifiedPostDB = new MockUnverifiedPostDB();

    function getPostDBgetter(_db: any) {
        return function (db: any) {
            if (db != postDB)
                throw new Error("Unexpected DB encountered in test");
            return _db;
        };
    }

    const client = new Client(mockUI.ui, finalSettings, {
        session: mockSessionStorage,
        userDBConn: null,
        userDBConstructor: (_, name) => {
            userDB.name = name;
            return userDB;
        },
        postDBConn: null,
        postDBConstructor: (_, name) => {
            postDB.name = name;
            return postDB;
        },
        verifiedPostDBConstructor: getPostDBgetter(verifiedPostDB),
        unverifiedPostDBConstructor: getPostDBgetter(unverifiedPostDB),
    });
    return {
        mockUI: mockUI,
        client: client,
        settings: finalSettings,
        storage: mockSessionStorage,
        userDB: userDB,
        postDB: postDB,
        verifiedPostDB: verifiedPostDB,
        unverifiedPostDB: unverifiedPostDB,
    };
}

type ClientCB = (clients: Array<MockedClient>) => Promise<void>;
interface Login {
    name: string;
    idmgmt: IdentityTypes;
}

async function withMockedClients(
    settings: object,
    logins: Array<Login>,
    callback: ClientCB
) {
    let error: any = null;
    const clients: Array<MockedClient> = [];
    for (let login of logins) {
        const mockedClient = newMockedClient(
            settings,
            login.name,
            login.idmgmt
        );
        await mockedClient.client.setupWaiter;
        clients.push(mockedClient);
    }

    try {
        await callback(clients);
    } catch (e) {
        error = e;
    }

    for (let mockedClient of clients) {
        mockedClient.client.destroy();
    }
    if (error) throw error;
}

document.addEventListener("DOMContentLoaded", () => {
    (window as any).test = {
        JsStore: JsStore,
        Db: Db,
        Client: Client,
        MockUI: MockUI,
        UIElements: UIElements,
        settings: settings,
        newMockedClient: newMockedClient,
        withMockedClients: withMockedClients,
        TestSuite: TestSuite,
    };
});
