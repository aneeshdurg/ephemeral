import { ConnectionMap, Identity } from "./objects";

type PostCB = (contents: string, parent: string | null) => Promise<void>;

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
    name: HTMLElement;
    id: HTMLElement;
    peerid: HTMLElement;
    posts: HTMLElement;
    content: HTMLElement;
    console: HTMLElement;
    connectionsMap: ConnectionMap;
    potentialPeers: Set<string>;
    postCB: PostCB;

    constructor(
        postCB: PostCB,
        connectionsMap: ConnectionMap,
        potentialPeers: Set<string>
    ) {
        this.activeConnections = document.getElementById("activeconnections")!;
        this.activeConnections.addEventListener("click", () => {
            console.log(connectionsMap);
        });

        this.totalConnections = document.getElementById("totalconnections")!;
        this.activeConnections.addEventListener("click", () => {
            console.log(potentialPeers);
        });

        this.connectionsMap = connectionsMap;
        this.potentialPeers = potentialPeers;

        this.name = document.getElementById("name")!;
        this.id = document.getElementById("id")!;
        this.peerid = document.getElementById("peerid")!;
        this.posts = document.getElementById("posts")!;
        this.content = document.getElementById("content")!;
        this.console = document.getElementById("console")!;

        this.postCB = postCB;
        this.enableConsoleMode();
    }

    enableConsoleMode() {
        this.console.style.display = "";
        this.content.style.display = "none";
    }

    logToConsole(msg: string) {
        this.console.innerHTML += `> ${msg}<br>`;
    }

    disableConsoleMode() {
        setTimeout(() => {
            this.console.style.display = "none";
            this.content.style.display = "";
        }, 500);
    }

    updateConnectionsUI() {
        this.totalConnections.innerHTML =
            "" + (this.potentialPeers.size + this.connectionsMap.size);
        this.activeConnections.innerHTML = "" + this.connectionsMap.size;
    }

    updateIdentity(ident: Identity, peerid: string) {
        this.id.innerHTML = ident.id;
        this.id.style.color = idToColor(ident.id);
        this.name.innerHTML = ident.name;
        this.peerid.innerHTML = peerid;
    }

    async returnToIndex() {
        setTimeout(() => {
            window.location.href = "./index.html";
        }, 1000);
        // give time for the reload to take place
        await new Promise((r) => setTimeout(r, 2 * 1000));
    }
}
