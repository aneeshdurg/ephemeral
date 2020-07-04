import * as React from "react";
import * as ReactDOM from "react-dom";
import localforage from "localforage";

import * as settings from "../settings.json";
import { Client, Settings } from "../client";
import { UIElements, UIElementsArgs } from "../ui";

class EphemeralTest extends React.Component<{}, {}> {
    render() {
        return (<>See <code>window.test</code> for the test objects!</>);
    }
}

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

interface MockedClient {
    mockUI: MockUI;
    client: Client;
    settings: Settings;
}
function newMockedClient(newSettings: any): MockedClient {
    const finalSettings = {...settings};
    Object.keys(newSettings).forEach((key_) => {
        const key = key_ as keyof Settings;
        finalSettings[key] = newSettings[key];
    });

    const mockUI = new MockUI();
    const client = new Client(mockUI.ui, finalSettings);
    return {
        mockUI: mockUI,
        client: client,
        settings: finalSettings,
    };
}

document.addEventListener("DOMContentLoaded", () => {
    ReactDOM.render(<EphemeralTest />, document.body);
    (window as any).test = {
        localforage: localforage,
        Client: Client,
        MockUI: MockUI,
        UIElements: UIElements,
        settings: settings,
        newMockedClient: newMockedClient,
    };
});
