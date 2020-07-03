import { ConnectionMap } from "./objects";
import { Identity } from "./identity";
import { ConnectionUpdaterCB } from "./components/connections";

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

export class UIElements {
    activeConnections: HTMLElement;
    totalConnections: HTMLElement;

    updateIdent: ConnectionUpdaterCB;

    page: HTMLElement;
    console: HTMLElement;

    connectionsMap: ConnectionMap | null = null;
    potentialPeers: Set<string> | null = null;

    // TODO take in renderPostCB and CBs for enabling/disabling console mode
    // also take in all elements via react refs instead of by id
    constructor(updateIdent: ConnectionUpdaterCB) {
        this.activeConnections = document.getElementById("activeconnections")!;
        this.totalConnections = document.getElementById("totalconnections")!;

        this.updateIdent = updateIdent;

        this.page = document.getElementById("page")!;
        this.console = document.getElementById("console")!;
        this.enableConsoleMode();
    }

    initialize(connectionsMap: ConnectionMap, potentialPeers: Set<string>) {
        this.connectionsMap = connectionsMap;
        this.potentialPeers = potentialPeers;
    }

    enableConsoleMode() {
        this.console.style.display = "";
        this.page.style.display = "none";
    }

    logToConsole(msg: string) {
        this.console.innerHTML += `> ${msg}<br>`;
    }

    disableConsoleMode() {
        setTimeout(() => {
            this.console.style.display = "none";
            this.page.style.display = "";
        }, 500);
    }

    updateConnectionsUI() {
        this.totalConnections.innerHTML =
            "" + (this.potentialPeers!.size + this.connectionsMap!.size);
        this.activeConnections.innerHTML = "" + this.connectionsMap!.size;
    }

    updateIdentity(ident: Identity, peerid: string) {
        this.updateIdent({
            name: ident.name,
            peerid: peerid,
            id: ident.id,
            idColor: idToColor(ident.id),
        });
    }

    async returnToIndex() {
        setTimeout(() => {
            window.location.href = "./index.html";
        }, 1000);
        // give time for the reload to take place
        await new Promise((r) => setTimeout(r, 2 * 1000));
    }
}
