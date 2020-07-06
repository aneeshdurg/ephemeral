import localforage from "localforage";

import * as settings from "../settings.json";
import { Client, Settings } from "../client";
import { Database, DatabaseParams, DatabaseStorage } from "../storage";
import { UIElements, UIElementsArgs } from "../ui";
import { IdentityTypes } from "../identity";
import { TestSuite } from "./testLib";

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

class MockDatabaseStorage implements DatabaseStorage {
    storage = new MockStorage();

    async getItem(key: string) {
        return this.storage.getItem(key);
    }

    async setItem(key: string, value: any) {
        this.storage.setItem(key, value);
    }

    async clear() {
        this.storage.clear();
    }
}

class MockDatabase implements Database {
    instances: Map<string, MockDatabaseStorage> = new Map();

    createInstance(params: DatabaseParams) {
        if (!this.instances.has(params.name))
            this.instances.set(params.name, new MockDatabaseStorage());
        return this.instances.get(params.name)!;
    }
}

interface MockedClient {
    mockUI: MockUI;
    client: Client;
    settings: Settings;
    storage: MockStorage;
    database: MockDatabase;
}

function newMockedClient(
    database: Database,
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
    const mockStorage = new MockStorage();
    mockStorage.setItem("name", name);
    mockStorage.setItem("idmgmt", idmgmt);
    const client = new Client(mockUI.ui, finalSettings, {
        session: mockStorage,
        database: database,
    });
    return {
        mockUI: mockUI,
        client: client,
        settings: finalSettings,
        storage: mockStorage,
        database: mockDB,
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
    const mockDB = new MockDatabase();
    for (let login of logins) {
        const mockedClient = newMockedClient(
            mockDB,
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
        localforage: localforage,
        Client: Client,
        MockUI: MockUI,
        UIElements: UIElements,
        settings: settings,
        newMockedClient: newMockedClient,
        withMockedClients: withMockedClients,
        TestSuite: TestSuite,
    };
});
