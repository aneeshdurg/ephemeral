import localforage from "localforage";

import * as settings from "../settings.json";
import { Client, Settings } from "../client";
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
        const record = (name: string, retval: any) => that.recordCall.bind(that, name, retval);
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
        if (!this.recordedCalls.has(name))
            this.recordedCalls.set(name, []);
        const calls = this.recordedCalls.get(name)!;
        calls.push(args);

        return retval;
    }
}

class MockStorage implements Storage {
    storage: Map<string, string> = new Map();

    clear() {
        this.storage = new Map();
    }

    getItem(key: string) {
        return this.storage.get(key) || null;
    }

    setItem(key: string, value: string) {
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

interface MockedClient {
    mockUI: MockUI;
    client: Client;
    settings: Settings;
    storage: MockStorage;
    // TODO also mock out localforage storage
}

function newMockedClient(newSettings: any, name: string, idmgmt: IdentityTypes): MockedClient {
    const finalSettings = {...settings};
    Object.keys(newSettings).forEach((key_) => {
        const key = key_ as keyof Settings;
        finalSettings[key] = newSettings[key];
    });

    const mockUI = new MockUI();
    const mockStorage = new MockStorage();
    mockStorage.setItem("name", name);
    mockStorage.setItem("idmgmt", idmgmt);
    const client = new Client(mockUI.ui, finalSettings, mockStorage);
    return {
        mockUI: mockUI,
        client: client,
        settings: finalSettings,
        storage: mockStorage,
    };
}

document.addEventListener("DOMContentLoaded", () => {
    (window as any).test = {
        localforage: localforage,
        Client: Client,
        MockUI: MockUI,
        UIElements: UIElements,
        settings: settings,
        newMockedClient: newMockedClient,
        TestSuite: TestSuite,
    };
});
