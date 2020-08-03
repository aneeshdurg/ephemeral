import { ConnectionMap } from "./client";
import { Identity } from "./identity";
import { Post } from "./post";
import { ConnectionsUpdaterCB, IdentUpdaterCB } from "./components/connections";
export declare type AddPostCB = (p: Post, editable: boolean, update: boolean) => boolean;
export declare function idToColor(id: string): string;
export interface UIElementsArgs {
    renderPost: AddPostCB;
    updateConns: ConnectionsUpdaterCB;
    updateIdent: IdentUpdaterCB;
    enableConsoleMode: () => void;
    disableConsoleMode: () => void;
    console: HTMLDivElement;
    returnToIndex: () => Promise<void>;
    raiseAlert: (contents: string, callback: () => void) => void;
    raiseConfirmDelete: (name: string, callback: (b: boolean) => void) => void;
}
export declare class UIElements {
    renderPost: AddPostCB;
    updateConns: ConnectionsUpdaterCB;
    updateIdent: IdentUpdaterCB;
    enableConsoleMode: () => void;
    disableConsoleMode: () => void;
    console: HTMLDivElement;
    returnToIndex: () => Promise<void>;
    connectionsMap: ConnectionMap | null;
    potentialPeers: Set<string> | null;
    _raiseConfirmDelete: (name: string, callback: (b: boolean) => void) => void;
    _raiseAlert: (contents: string, callback: () => void) => void;
    constructor(args: UIElementsArgs);
    initialize(connectionsMap: ConnectionMap, potentialPeers: Set<string>): void;
    logToConsole(msg: string): void;
    updateConnectionsUI(): void;
    updateIdentity(ident: Identity, peerid: string): void;
    raiseAlert(contents: string): Promise<void>;
    raiseConfirmDelete(name: string): Promise<boolean>;
}
