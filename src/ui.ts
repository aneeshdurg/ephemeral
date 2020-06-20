import showdown from "showdown";

import { ConnectionMap, Identity, Post } from "./objects";

type PostCB = (contents: string) => Promise<void>;

function idToColor(id: string) {
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
    // let sum = 0;
    // for (let i = 0; i < id.length; i++) {
    //     sum += id.charCodeAt(i);
    //     sum %= 0xffffff;
    //     console.log("Sum", sum, id.charCodeAt(i));
    // }

    // return '#' + sum.toString(16);
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

        // These two elements aren't needed outside this scope
        const postInput = <HTMLInputElement>(
            document.getElementById("post-input")!
        );
        async function doPost() {
            if (postInput.value != "") {
                const converter = new showdown.Converter();
                const contents = converter.makeHtml(postInput.value);
                await postCB(contents);
                postInput.value = "";
            }
        }
        postInput.addEventListener("keydown", async (e) => {
            if (!e.shiftKey && e.key == "Enter") doPost();
        });
        const postSubmit = document.getElementById("post-submit")!;
        postSubmit.addEventListener("click", doPost);

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

    _createAuthorNameTag(ident: Identity) {
        const author = document.createElement("div");
        author.classList.add("post-author");
        author.innerHTML = `<b>${ident.name}</b>:`;
        author.title = `${ident.name}@${ident.id}`;
        author.style.color = idToColor(ident.id);
        author.dataset.expanded = "";
        author.onclick = () => {
            if (author.dataset.expanded) {
                author.innerHTML = `<b>${ident.name}</b>:`;
                author.dataset.expanded = "";
            } else {
                author.innerHTML = `<b>${ident.name}</b>@${ident.id}:`;
                author.dataset.expanded = "true";
            }
        };

        return author;
    }

    renderPost(post: Post) {
        const newPost = document.createElement("div");
        newPost.classList.add("post");

        const author = this._createAuthorNameTag(post.author);
        const contents = document.createElement("div");
        contents.classList.add("post-contents");
        contents.innerHTML = post.contents;

        newPost.appendChild(author);
        newPost.appendChild(contents);

        // Make the newest posts the first child. In the future we'll want to
        // chronologically sort or something. Will probably need to dynamically
        // render by querying the cache for a time range.
        this.posts.insertBefore(newPost, this.posts.childNodes[0]);
    }

    async returnToIndex() {
        console.log("reloading");
        setTimeout(() => {
            window.location.href = "./index.html";
        }, 1000);
        // give time for the reload to take place
        await new Promise((r) => setTimeout(r, 2 * 1000));
    }
}
