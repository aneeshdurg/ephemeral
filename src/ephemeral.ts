import localforage from "localforage";
import Peer from "peerjs";
import showdown from "showdown";

import {
    byteArrayToB32Str,
    digestMessage,
    Identity,
    IdentityCache,
    Message,
    MessageTypes,
    Post,
    PostCache,
    PostMessage,
    QueryPostMessage,
    QueryPostRespMessage,
    QueryIdentMessage,
    QueryIdentRespMessage,
    RequestPostMessage,
} from "./objects";
import * as settings from "./settings.json";

document.addEventListener("DOMContentLoaded", () => {
    const identity = new Identity();
    const knownIds = new IdentityCache();
    const unknownIds = new Set();

    let currentConnections = 0;

    const connectionsMap = new Map();
    const potentialPeers = new Set();
    const postCache = new PostCache("pc");
    const unverifiedPostCache = new PostCache("upc");

    let peer: any = null;
    let datastore: any = null;
    let pubKey: any = null;
    let pubKeyJWK: JsonWebKey | null = null;
    let privKey: any = null;

    class UIElements {
        activeConnections: HTMLElement;
        totalConnections: HTMLElement;
        name: HTMLElement;
        id: HTMLElement;
        peerid: HTMLElement;
        posts: HTMLElement;
        content: HTMLElement;
        console: HTMLElement;
        constructor() {
            this.activeConnections = document.getElementById(
                "activeconnections"
            )!;
            this.activeConnections.addEventListener("click", () => {
                console.log(connectionsMap);
            });

            this.totalConnections = document.getElementById(
                "totalconnections"
            )!;
            this.activeConnections.addEventListener("click", () => {
                console.log(potentialPeers);
            });

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
                    const post = new Post(identity, contents);
                    await post.initialize();
                    addPost(post);

                    // Broadcast new post
                    broadcast(new PostMessage(post));
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
                "" + (potentialPeers.size + currentConnections);
            this.activeConnections.innerHTML = "" + currentConnections;
        }
    }

    const ui = new UIElements();

    function recvPost(raw: any) {
        console.log("Recieved post!");
        const post = new Post(new Identity(), "");
        post.fromJson(raw.post);
        addPost(post);
    }

    function recvPostQuery(conn: any) {
        conn.send(new QueryPostRespMessage(postCache.postIds));
    }

    function recvRequestPost(conn: any, data: any) {
        if (postCache.has(data.postid)) {
            conn.send(new PostMessage(postCache.posts.get(data.postid)!));
        }
    }

    function recvPostQueryResp(conn: any, raw: any) {
        // TODO make sure that we are waiting for this resp on this connection
        const unknownPosts = [];
        for (let i = 0; i < raw.posts.length; i++) {
            const postid = raw.posts[i].postid;
            if (postCache.has(postid) || unverifiedPostCache.has(postid))
                continue;
            unknownPosts.push(postid);
        }

        if (unknownPosts.length) {
            console.log("Found unknown posts:", unknownPosts);
            // TODO limit the number of posts requested
            // TODO allow multiple ids per request
            // TODO implement acks for the request?
            unknownPosts.forEach((postid) => {
                conn.send(new RequestPostMessage(postid));
            });
        }
    }

    async function recvQueryIdent(conn: any, query: any) {
        console.log(query, unknownIds, knownIds, identity.id);
        if (query.id == identity.id) {
            const pubKey = await datastore.getItem("publicKey");
            conn.send(new QueryIdentRespMessage(identity, pubKey));
        } else {
            if (knownIds.has(query.id)) {
                const entry: any = knownIds.users.get(query.id);
                conn.send(
                    new QueryIdentRespMessage(entry.ident, entry.publicKey)
                );
            } else if (!unknownIds.has(query.id)) {
                unknownIds.add(query.id);
                // Ask neighbors except the one that asked
                broadcast(
                    new QueryIdentMessage(query.id),
                    new Set([conn.peer])
                );
            }
        }
    }

    async function recvQueryIdentResp(resp: any) {
        if (knownIds.has(resp.ident.id)) return;

        const expectedid = byteArrayToB32Str(await digestMessage(resp.publicKey.n));
        if (resp.ident.id != expectedid) return;

        console.log(resp);

        const respKey = await crypto.subtle.importKey(
            "jwk",
            resp.publicKey,
            algorithm,
            true,
            ["verify"]
        );
        knownIds.add(resp.ident, respKey);
        unknownIds.delete(resp.ident.id);

        // resolve any unverified posts:
        unverifiedPostCache.postIds.forEach((entry) => {
            const post = unverifiedPostCache.posts.get(entry.postid)!;
            console.log("Found unverified post", entry.postid);
            if (post.author.id == resp.ident.id) addPost(post);
        });
    }

    async function recv(conn: any, data: any) {
        if (data.type == MessageTypes.POST) {
            recvPost(data);
        } else if (data.type == MessageTypes.QUERYPOSTS) {
            recvPostQuery(conn);
        } else if (data.type == MessageTypes.QUERYPOSTSRESP) {
            recvPostQueryResp(conn, data);
        } else if (data.type == MessageTypes.REQUESTPOSTS) {
            recvRequestPost(conn, data);
        } else if (data.type == MessageTypes.QUERYIDENT) {
            await recvQueryIdent(conn, data);
        } else if (data.type == MessageTypes.QUERYIDENTRESP) {
            await recvQueryIdentResp(data);
        } else {
            console.log("Unknown message:", data);
        }
    }

    function accept(conn: any) {
        if (
            currentConnections + 1 > settings.maxconnections ||
            connectionsMap.has(conn.peer)
        ) {
            console.log(`Rejecting ${conn.peer}`);
            conn.close();
            return;
        }

        console.log(`Accepting ${conn.peer}`);
        console.log(conn);
        conn.on("error", (e: any) => {
            console.log("Connection", conn.peer, "encountered error", e);
        });

        conn.on("close", () => {
            console.log("Connection closed!");
            connectionsMap.delete(conn.peer);
            currentConnections--;
            ui.updateConnectionsUI();
        });

        connectionsMap.set(conn.peer, {
            conn: conn,
            open: false,
            time: new Date().getTime(),
        });
        currentConnections++;

        ui.updateConnectionsUI();

        conn.on("open", () => {
            console.log(`Channel with ${conn.peer} opened!`);
            connectionsMap.get(conn.peer).open = true;
            conn.on("data", (data: Object) => recv(conn, data));
        });
    }

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

    async function readJSONfromURL(url: string) {
        const resp = await fetch(url);
        if (resp.status !== 200) throw `Could not fetch ${url}`;

        let data = "";
        const reader = resp.body!.getReader();
        let done = false;
        while (!done) {
            let body = await reader.read();
            if (!body.value) {
                done = true;
            } else {
                data += String.fromCharCode.apply(null, Array.from(body.value));
            }
        }
        console.log(url, data);
        return JSON.parse(data);
    }

    async function refreshConnections(peer: any) {
        while (currentConnections < settings.maxconnections) {
            // scan through potential connections and connect to them
            if (potentialPeers.size) {
                console.log("Found potential peer");
                // connect to 1 peer to start with
                let peerid = potentialPeers.keys().next().value;
                potentialPeers.delete(peerid);

                console.log(
                    `Establishing connection with ${peerid}`,
                    potentialPeers
                );
                const conn = peer.connect(peerid);
                accept(conn);
                break;
            } else {
                // if there are no potential connections, fetch from the peerserver
                const host = settings.peercloud.host;
                const port = settings.peercloud.port;
                const path = settings.peercloud.path;
                const protocol = settings.peercloud.protocol;
                const url = `${protocol}://${host}:${port}/${path}/peerjs/peers`;
                const peerList = await readJSONfromURL(url);
                let addedPeers = 0;
                peerList.forEach((peerid: string) => {
                    if (peerid != peer.id && !connectionsMap.has(peerid)) {
                        potentialPeers.add(peerid);
                        addedPeers++;
                    }
                });

                if (addedPeers == 0) break;
            }
        }
    }

    const algorithm = {
        name: "RSASSA-PKCS1-v1_5",
        hash: { name: "SHA-256" },
    };
    async function setupIdentity(id: string) {
        const name = sessionStorage.getItem("name") || id;
        // TODO don't use datastore unless guest - or use a unique datastore
        // guaranteed not to collide w/ user datastore
        datastore = localforage.createInstance({ name: name });
        await postCache.restoreFromStore(datastore);
        renderCache();

        const idmgmt = sessionStorage.getItem("idmgmt") || "guest";
        if (idmgmt == "createid") {
            ui.logToConsole("Searching for existing identity");
            const testID = await datastore.getItem("gid");
            if (testID) {
                const input = prompt(
                    `Warning! Found an existing identity for ${name}. Please type "${name}" to confirm deletion.`
                );
                console.log("Got input", input, name);
                if (input != name) {
                    console.log("reloading");
                    window.location.href = "../";
                    // give time for the reload to take place
                    await new Promise((r) => setTimeout(r, 1 * 60 * 60 * 1000));
                }

                console.log("deleting");
                ui.logToConsole("Deleting old identity.");
                await datastore.clear();
            }

            ui.logToConsole("Creating new identity.");
            ui.logToConsole("Generating RSA keys.");
            const keyParams = {
                ...algorithm,
                modulusLength: 4096,
                publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
            };
            const keys = <CryptoKeyPair>(
                await crypto.subtle.generateKey(keyParams, true, [
                    "sign",
                    "verify",
                ])
            );
            ui.logToConsole("Done generating RSA keys.");

            privKey = keys.privateKey;
            const privKeyJWK = await crypto.subtle.exportKey("jwk", privKey);
            delete privKeyJWK["key_ops"];
            // TODO encrypt this key w/ a password
            // could use AES-GCM encryption and let the user's password be the
            // additional data
            await datastore.setItem("privateKey", privKeyJWK);

            pubKey = keys.publicKey;
            pubKeyJWK = await crypto.subtle.exportKey("jwk", pubKey);
            delete pubKeyJWK["key_ops"];
            console.log("Generated public key", pubKeyJWK);
            await datastore.setItem("publicKey", pubKeyJWK);
            ui.logToConsole(`Public key: ${pubKeyJWK.n}`);

            const globalID = byteArrayToB32Str(await digestMessage(<string>pubKeyJWK.n));
            console.log("gid", globalID);
            await datastore.setItem("gid", globalID);
            ui.logToConsole(`Global ID: ${globalID}`);

            ui.logToConsole(`Created ID:<br><b>${name}</b>@${globalID}`);
            sessionStorage.setItem("idmgmt", "reuseid");
        } else if (idmgmt == "reuseid") {
            ui.logToConsole(`Retrieving stored ID`);
            const globalID = await datastore.getItem("gid");
            if (!globalID) {
                setTimeout(() => {
                    window.location.href = "../";
                }, 1000);
                alert(
                    `Could not find account for ${name}. Please create an ID instead`
                );
            }

            ui.logToConsole(`Restoring ID:<br><b>${name}</b>@${globalID}`);
            pubKeyJWK = await datastore.getItem("publicKey");
            pubKey = await crypto.subtle.importKey(
                "jwk",
                pubKeyJWK!,
                algorithm,
                true,
                ["verify"]
            );

            const privKeyJWK = await datastore.getItem("privateKey");
            privKey = await crypto.subtle.importKey(
                "jwk",
                privKeyJWK,
                algorithm,
                true,
                ["sign"]
            );
            ui.logToConsole("Rehydrated ID");
        }

        if (idmgmt != "guest") {
            identity.initialize(name, await datastore.getItem("gid"));
        } else {
            ui.logToConsole(
                `Registering on network as guest:<br><b>${name}</b>@${id}`
            );
            identity.initialize(name, `e'${id}`);
        }
    }

    async function onopen(peer: any, id: string) {
        ui.logToConsole(`Connected to peercloud. Session id is ${id}.`);

        await setupIdentity(id);

        ui.id.innerHTML = identity.id;
        ui.id.style.color = idToColor(identity.id);
        ui.name.innerHTML = identity.name;
        ui.peerid.innerHTML = id;

        ui.logToConsole("Accpeting incoming connections.");
        peer.on("connection", accept);
        await refreshConnections(peer);

        ui.logToConsole("Initialization done.");
        ui.disableConsoleMode();
    }

    function broadcast(msg: Message, exclude_?: Set<string>) {
        let exclude = exclude_ || new Set();
        connectionsMap.forEach((channel) => {
            if (!exclude.has(channel.conn.peer)) {
                if (channel.open) {
                    channel.conn.send(msg);
                } else {
                    if (
                        new Date().getTime() - channel.time >
                        settings.connectiontimeout
                    ) {
                        console.log("Purging", channel.conn.peer);
                        connectionsMap.delete(channel.conn.peer);
                        ui.updateConnectionsUI();
                    }
                }
            }
        });
    }

    function verifyPost(post: Post) {
        if (post.author.id == identity.id || post.author.id.startsWith("e'"))
            return true;

        if (knownIds.has(post.author.id)) {
            // TODO verify a signature on a post
            return true;
        } else {
            unknownIds.add(post.author.id);
            broadcast(new QueryIdentMessage(post.author.id));
            return null;
        }

        return false;
    }

    function createAuthorNameTag(ident: Identity) {
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

    function renderPost(post: Post) {
        const newPost = document.createElement("div");
        newPost.classList.add("post");

        const author = createAuthorNameTag(post.author);
        const contents = document.createElement("div");
        contents.classList.add("post-contents");
        contents.innerHTML = post.contents;

        newPost.appendChild(author);
        newPost.appendChild(contents);

        // Make the newest posts the first child. In the future we'll want to
        // chronologically sort or something. Will probably need to dynamically
        // render by querying the cache for a time range.
        ui.posts.insertBefore(newPost, ui.posts.childNodes[0]);
    }

    function renderCache() {
        // TODO sort by the post's timestamp
        postCache.posts.forEach((post) => {
            renderPost(post);
        });
    }

    function addPost(post: Post) {
        if (postCache.has(post.id)) {
            return;
        }

        const verificationState = verifyPost(post);
        if (verificationState == null) {
            unverifiedPostCache.add(post);
            return;
        } else unverifiedPostCache.remove(post.id);

        if (!verificationState) return;

        postCache.add(post);

        // TODO sort by the post's timestamp
        renderPost(post);
    }

    async function savePosts() {
        await postCache.saveToStore(datastore);
    }

    function queryPosts() {
        // TODO use a random stream pick k elements algorithm instead of querying
        // all conns
        broadcast(new QueryPostMessage());
    }

    function queryIdents() {
        unverifiedPostCache.postIds.forEach((entry) => {
            const post = unverifiedPostCache.posts.get(entry.postid)!;
            broadcast(new QueryIdentMessage(post.author.id));
        });
    }

    async function main() {
        // debug.dropPostCache = () => {
        //     // TODO
        // }

        ui.logToConsole("Setting up initial state");
        ui.logToConsole("Connecting to peercloud");

        peer = new Peer(undefined, {
            host: settings.peercloud.host,
            port: settings.peercloud.port,
            path: settings.peercloud.path,
            config: { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] },
        });
        ui.logToConsole("Waiting for peercloud response");
        peer.on("open", (id: string) => onopen(peer, id));
        peer.on("error", (_e: any) => {
            // TODO reenable this error when necessary
            // alert("Could not connect to peercloud\n" + e + `\nid: ${peer.id}`);
            // throw new Error(e);
        });

        setInterval(savePosts, settings.intervals.saveposts);
        setInterval(queryPosts, settings.intervals.queryposts);
        setInterval(queryIdents, settings.intervals.queryidents);
        setInterval(() => {
            refreshConnections(peer);
        }, settings.intervals.refreshconnections);
        setInterval(() => {
            unverifiedPostCache.prune();
            postCache.prune();
        }, settings.intervals.prunecache);
    }

    main();
});
