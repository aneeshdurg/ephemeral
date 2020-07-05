import { ConnectionMap } from "./objects";
import { Identity } from "./identity";
import { Post } from "./post";
import { ConnectionsUpdaterCB, IdentUpdaterCB } from "./components/connections";

export type AddPostCB = (p: Post, editable: boolean) => boolean;

export function idToColor(id: string) {
    function hashCode(str: string) {
        // java String#hashCode
        var hash = 0;
        for (var i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        return hash;
    }

    function intToRGB(i: number) {
        var c = (i & 0x00ffffff).toString(16).toUpperCase();

        return "00000".substring(0, 6 - c.length) + c;
    }

    return "#" + intToRGB(hashCode(id));
}

export interface UIElementsArgs {
    renderPost: AddPostCB;
    updateConns: ConnectionsUpdaterCB;
    updateIdent: IdentUpdaterCB;
    enableConsoleMode: () => void;
    disableConsoleMode: () => void;
    console: HTMLDivElement;
    returnToIndex: () => Promise<void>;
}

export class UIElements {
    renderPost: AddPostCB;

    updateConns: ConnectionsUpdaterCB;
    updateIdent: IdentUpdaterCB;

    enableConsoleMode: () => void;
    disableConsoleMode: () => void;
    console: HTMLDivElement;

    returnToIndex: () => Promise<void>;

    connectionsMap: ConnectionMap | null = null;
    potentialPeers: Set<string> | null = null;

    constructor(args: UIElementsArgs) {
        this.renderPost = args.renderPost;

        this.updateConns = args.updateConns;
        this.updateIdent = args.updateIdent;

        this.enableConsoleMode = args.enableConsoleMode;
        this.disableConsoleMode = args.disableConsoleMode;
        this.console = args.console;

        this.returnToIndex = args.returnToIndex;
    }

    initialize(connectionsMap: ConnectionMap, potentialPeers: Set<string>) {
        this.connectionsMap = connectionsMap;
        this.potentialPeers = potentialPeers;
    }

    logToConsole(msg: string) {
        this.console.innerHTML += `> ${msg}<br>`;
    }

    updateConnectionsUI() {
        this.updateConns({
            active: this.connectionsMap!.size,
            total: this.potentialPeers!.size + this.connectionsMap!.size,
        });
    }

    updateIdentity(ident: Identity, peerid: string) {
        this.updateIdent({
            name: ident.name,
            peerid: peerid,
            id: ident.id,
            idColor: idToColor(ident.id),
        });
    }
}
