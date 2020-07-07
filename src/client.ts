import Peer from "peerjs";

import {
    Message,
    MessageTypes,
    PostMessage,
    QueryPostMessage,
    QueryPostRespMessage,
    QueryIdentMessage,
    QueryIdentRespMessage,
    RequestPostMessage,
} from "./messages";
import { UIElements } from "./ui";
import { hash, generateKeys, loadKeys } from "./crypto";
import { Identity, IdentityCache, IdentityTypes } from "./identity";
import { Post, PostCache, PostVerificationState } from "./post";
import { DatabaseStorage, Storages } from "./storage";
import * as _settings from "./settings.json";

export type Settings = typeof _settings;

interface Connection {
    conn: any;
    open: boolean;
    time: number;
}

export type ConnectionMap = Map<string, Connection>;

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
    return JSON.parse(data);
}

export class Client {
    identity = new Identity();
    knownIds = new IdentityCache();
    unknownIds: Set<string> = new Set();

    // TODO add "transiantConnections" which represents connections established
    // to send a response to a query
    connectionsMap: ConnectionMap = new Map();
    potentialPeers: Set<string> = new Set();
    postCache = new PostCache("pc");
    unverifiedPostCache = new PostCache("upc");

    // TODO add types for peer and datastore
    _peer: Peer | null = null;
    get peer() {
        return this._peer!;
    }

    _datastore: DatabaseStorage | null = null;
    get datastore() {
        return this._datastore!;
    }

    // crypto objects
    pubKey: CryptoKey | null = null;
    pubKeyJWK: JsonWebKey | null = null;
    privKey: CryptoKey | null = null;

    ui: UIElements;
    settings: Settings;

    setupWaiter: Promise<void>;
    _setupResolver: (() => void) | null = null;

    timers: Array<ReturnType<typeof setInterval>> = [];

    constructor(ui: UIElements, settings: Settings, storages: Storages) {
        this.ui = ui;
        this.settings = settings;

        this.ui.initialize(this.connectionsMap, this.potentialPeers);
        this.ui.enableConsoleMode();

        this._peer = new Peer(undefined, {
            host: this.settings.peercloud.host,
            port: this.settings.peercloud.port,
            path: this.settings.peercloud.path,
            config: { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] },
        });
        this.ui.logToConsole("Waiting for peercloud response");

        const that = this;
        this.setupWaiter = new Promise((r) => {
            that._setupResolver = r;
        });

        this.peer.on("open", (id: string) => that.onopen(storages, id));
        this.peer.on("error", (e: any) => {
            // TODO reenable this error when necessary
            if (e.type == "browser-incompatible") {
                this.ui.raiseAlert("Sorry, we don't support this browser!");
                throw new Error("Unsupported browser " + e);
            } else if (e.type == "disconnected") {
                // You've already disconnected this peer from the server and can no
                // longer make any new connections on it.
                // TODO is this only thrown when we explictily call disconnect?
            } else if (e.type == "network") {
                // Lost or cannot establish a connection to the signalling server.
                // TODO reconnect?
                this.ui.raiseAlert("Network error");
                throw new Error("Socket Error " + e);
            } else if (e.type == "peer-unavailable") {
                // The peer you're trying to connect to does not exist.
                // It's probably safe to ignore this - we haven't added the
                // connection to the connection map yet
                return;
            } else if (e.type == "server-error") {
                // Unable to reach the server.
                this.ui.raiseAlert(
                    "Server under maintainence; retry later\n" + e
                );
                throw new Error("Server Error " + e);
            } else if (e.type == "socket-error") {
                // An error from the underlying socket.
            } else if (e.type == "socket-closed") {
                // Probably could try reconnecting?
                this.ui.raiseAlert("Network error");
                throw new Error("Socket Error " + e);
            } else if (e.type == "webrtc") {
                // Native WebRTC errors.
                this.ui.raiseAlert("Network error");
                throw new Error("Socket Error " + e);
            }
            // TODO on disconnect create a new peer
        });

        async function savePosts() {
            await that.postCache.saveToStore(that.datastore);
        }

        async function saveIdents() {
            await that.knownIds.saveToStore(that.datastore);
        }

        if (!this.pubKey) {
            // Only set cache things if have a pubKey; aka not a guest.
            this.setInterval(savePosts, this.settings.intervals.saveposts);
            this.setInterval(saveIdents, this.settings.intervals.saveidents);
        }

        function queryPosts() {
            // TODO use a random stream pick k elements algorithm instead of querying
            // all conns
            that.broadcast(new QueryPostMessage());
        }
        this.setInterval(queryPosts, this.settings.intervals.queryposts);

        function queryIdents() {
            that.unknownIds.forEach((id) => {
                that.broadcast(new QueryIdentMessage(id));
            });
        }
        this.setInterval(queryIdents, this.settings.intervals.queryidents);
        this.setInterval(() => {
            that.refreshConnections();
        }, this.settings.intervals.refreshconnections);
        this.setInterval(() => {
            that.unverifiedPostCache.prune();
            that.postCache.prune();
        }, this.settings.intervals.prunecache);
    }

    setInterval(f: () => void, interval: number) {
        this.timers.push(setInterval(f, interval));
    }

    destroy() {
        // Stop all "threads"
        this.timers.forEach((timer: ReturnType<typeof setInterval>) => {
            console.log("Stopping timer");
            clearInterval(timer);
        });
        this.peer.destroy();
    }

    async postCB(contents: string, parent: string | null) {
        const post = new Post(this.identity, contents);
        await post.initialize(this.privKey);
        if (parent) post.setParent(parent);
        await this.addPost(post, true);

        // Broadcast new post
        this.broadcast(new PostMessage(post));
        // TODO don't broadcast replies and implement a query method for
        // retrieving post replies
        return post;
    }

    // Add a post to the cache and render it
    async addPost(post: Post, trusted: boolean) {
        if (this.postCache.has(post.id)) {
            return;
        }

        const verificationState = trusted
            ? PostVerificationState.SUCCESS
            : await post.verifyOwnership(this.knownIds);
        if (verificationState == PostVerificationState.PENDING) {
            this.unverifiedPostCache.add(post);
            this.unknownIds.add(post.author.id);
            this.broadcast(new QueryIdentMessage(post.author.id));
        } else this.unverifiedPostCache.remove(post.id);

        if (verificationState != PostVerificationState.SUCCESS) return;

        // TODO sort by the post's timestamp
        if (this.ui.renderPost(post, post.isOwnedBy(this.identity)))
            this.postCache.add(post);
    }

    broadcast(msg: Message, exclude_?: Set<string>) {
        let exclude = exclude_ || new Set();
        this.connectionsMap.forEach((channel) => {
            if (!exclude.has(channel.conn.peer)) {
                if (channel.open) {
                    channel.conn.send(msg);
                } else {
                    if (
                        new Date().getTime() - channel.time >
                        this.settings.connectiontimeout
                    ) {
                        console.log("Purging", channel.conn.peer);
                        this.connectionsMap.delete(channel.conn.peer);
                        this.ui.updateConnectionsUI();
                    }
                }
            }
        });
    }

    async recvPost(raw: any) {
        const post = new Post(new Identity(), "");
        post.fromJson(raw.post);
        await this.addPost(post, false);
    }

    recvPostQuery(conn: any) {
        // TODO only send new postids newer than the last time we responded to
        // QueryPost on this connection
        conn.send(new QueryPostRespMessage(this.postCache.postIds));
    }

    recvRequestPost(conn: any, data: any) {
        if (this.postCache.has(data.postid)) {
            conn.send(new PostMessage(this.postCache.posts.get(data.postid)!));
        }
    }

    recvPostQueryResp(conn: any, raw: any) {
        // TODO make sure that we are waiting for this resp on this connection
        const unknownPosts = [];
        for (let i = 0; i < raw.posts.length; i++) {
            const postid = raw.posts[i].postid;
            if (
                this.postCache.has(postid) ||
                this.unverifiedPostCache.has(postid)
            )
                continue;
            unknownPosts.push(postid);
        }

        if (unknownPosts.length) {
            console.log("Found unknown posts");
            // TODO have a concept of "following" to only view posts from some
            // users
            // TODO limit the number of posts requested
            // TODO allow multiple ids per request
            // TODO implement acks for the request?
            unknownPosts.forEach((postid: string) => {
                conn.send(new RequestPostMessage(postid));
            });
        }
    }

    async recvQueryIdent(conn: any, query: any) {
        if (query.id == this.identity.id) {
            conn.send(
                new QueryIdentRespMessage(this.identity, this.pubKeyJWK!)
            );
        } else {
            if (this.knownIds.has(query.id)) {
                const entry: any = this.knownIds.users.get(query.id);
                const keyJWK = await crypto.subtle.exportKey(
                    "jwk",
                    entry.publicKey
                );
                conn.send(new QueryIdentRespMessage(entry.ident, keyJWK));
                console.log("done");
            } else if (!this.unknownIds.has(query.id)) {
                this.unknownIds.add(query.id);
                // Ask neighbors except the one that asked
                this.broadcast(
                    new QueryIdentMessage(query.id),
                    new Set([conn.peer])
                );
            }
        }
    }

    async recvQueryIdentResp(resp: any) {
        if (this.knownIds.has(resp.ident.id)) return;

        const expectedid = await hash(resp.publicKey.n);
        if (resp.ident.id != expectedid) return;

        // TODO move this into crypto.ts
        const algorithm = {
            name: "RSASSA-PKCS1-v1_5",
            hash: { name: "SHA-256" },
        };
        const respKey = await crypto.subtle.importKey(
            "jwk",
            resp.publicKey,
            algorithm,
            true,
            ["verify"]
        );
        this.knownIds.add(resp.ident, respKey);
        this.unknownIds.delete(resp.ident.id);

        // resolve any unverified posts:
        this.unverifiedPostCache.postIds.forEach(async (entry) => {
            const post = this.unverifiedPostCache.posts.get(entry.postid)!;
            console.log("Found unverified post", entry.postid);
            if (post.author.id == resp.ident.id)
                await this.addPost(post, false);
        });
    }

    async recv(conn: any, data: any) {
        if (data.type == MessageTypes.POST) {
            await this.recvPost(data);
        } else if (data.type == MessageTypes.QUERYPOSTS) {
            this.recvPostQuery(conn);
        } else if (data.type == MessageTypes.QUERYPOSTSRESP) {
            this.recvPostQueryResp(conn, data);
        } else if (data.type == MessageTypes.REQUESTPOSTS) {
            this.recvRequestPost(conn, data);
        } else if (data.type == MessageTypes.QUERYIDENT) {
            await this.recvQueryIdent(conn, data);
        } else if (data.type == MessageTypes.QUERYIDENTRESP) {
            await this.recvQueryIdentResp(data);
        } else {
            console.log("Unknown message:", data);
        }
    }

    accept(conn: any) {
        if (!conn) {
            // this can happen if the peer was destroyed during
            // refreshConnections, it is safe to ignore
            return;
        }
        if (
            this.connectionsMap.size + 1 > this.settings.maxconnections ||
            this.connectionsMap.has(conn.peer)
        ) {
            console.log(
                this.peer.id,
                `Rejecting ${conn.peer}`,
                this.connectionsMap.size,
                this.connectionsMap.has(conn.peer)
            );
            conn.close();
            return;
        }

        console.log(this.peer.id, `Accepting ${conn.peer}`);
        console.log(conn);
        conn.on("error", (e: any) => {
            console.log("Connection", conn.peer, "encountered error", e);
        });

        const that = this;
        conn.on("close", () => {
            console.log("Connection closed!");
            that.connectionsMap.delete(conn.peer);
            that.ui.updateConnectionsUI();
        });

        this.connectionsMap.set(conn.peer, {
            conn: conn,
            open: false,
            time: new Date().getTime(),
        });
        this.ui.updateConnectionsUI();

        conn.on("open", () => {
            console.log(`Channel with ${conn.peer} opened!`);
            that.connectionsMap.get(conn.peer)!.open = true;
            conn.on("data", (data: Object) => that.recv(conn, data));
        });
    }

    async refreshConnections() {
        if (this.connectionsMap.size == this.settings.maxconnections) {
            // randomly try to drop a connection half the time:
            if (Math.random() > 0.5) {
                const idx = Math.floor(
                    Math.random() * this.connectionsMap.size
                );
                const connid = Array.from(this.connectionsMap.keys())[idx];
                const entry = this.connectionsMap.get(connid)!;
                // don't kill connection that haven't even opened yet or haven't
                // been alive for that long
                const currentTime = new Date().getTime();
                const delta = currentTime - entry.time;
                if (
                    !entry.open ||
                    delta < this.settings.intervals.refreshconnections
                )
                    return;

                entry.conn.close();

                this.connectionsMap.delete(connid);
                this.ui.updateConnectionsUI();
            }
            return;
        }

        while (this.connectionsMap.size < this.settings.maxconnections) {
            // scan through potential connections and connect to them
            if (this.potentialPeers.size) {
                console.log("Found potential peer");
                // connect to 1 peer to start with
                // choose a random peer:
                let idx = Math.floor(Math.random() * this.potentialPeers.size);
                let peerid = Array.from(this.potentialPeers.keys())[idx];
                // let peerid = potentialPeers.keys().next().value;
                this.potentialPeers.delete(peerid);

                console.log(
                    `Establishing connection with ${peerid}`,
                    this.potentialPeers
                );
                const conn = this.peer.connect(peerid);
                console.log(`Connected to ${peerid}`);
                this.accept(conn);
                break;
            } else {
                // if there are no potential connections, fetch from the peerserver
                const host = this.settings.peercloud.host;
                const port = this.settings.peercloud.port;
                const path = this.settings.peercloud.path;
                const protocol = this.settings.peercloud.protocol;
                const url = `${protocol}://${host}:${port}/${path}/peerjs/peers`;
                const peerList = await readJSONfromURL(url);
                let addedPeers = 0;
                peerList.forEach((peerid: string) => {
                    if (
                        peerid != this.peer.id &&
                        !this.connectionsMap.has(peerid)
                    ) {
                        this.potentialPeers.add(peerid);
                        addedPeers++;
                    }
                });

                if (addedPeers == 0) break;
            }
        }
    }

    renderCache() {
        // TODO sort by the post's timestamp
        this.postCache.posts.forEach((post) => {
            this.ui.renderPost(post, post.isOwnedBy(this.identity));
        });
    }

    // TODO pass in all storage classes to init
    async setupIdentity(storages: Storages, id: string) {
        const name = storages.session.getItem("name") || id;

        this.ui.logToConsole("Setting up identity");
        const idmgmt: IdentityTypes =
            <IdentityTypes>storages.session.getItem("idmgmt") ||
            IdentityTypes.Guest;

        if (idmgmt !== IdentityTypes.Guest) {
            this.ui.logToConsole("Retrieving datastore");
            this._datastore = storages.database.createInstance({ name: name });
        }

        if (idmgmt === IdentityTypes.CreateId) {
            this.ui.logToConsole("Searching for existing identity");
            console.log(this.datastore, this.datastore.getItem("gid"));
            const testID = await this.datastore.getItem("gid");
            if (testID) {
                const cancelled = await this.ui.raiseConfirmDelete(name);
                if (cancelled) await this.ui.returnToIndex();

                console.log("deleting");
                this.ui.logToConsole("Deleting old identity.");
                await this.datastore.clear();
            }

            this.ui.logToConsole("Creating new identity.");
            this.ui.logToConsole("Generating RSA keys.");
            const keys = await generateKeys();
            this.ui.logToConsole("Done generating RSA keys.");

            this.privKey = keys.privateKey;
            const privKeyJWK = await crypto.subtle.exportKey(
                "jwk",
                this.privKey
            );
            delete privKeyJWK["key_ops"];
            // TODO encrypt this key w/ a password
            // could use AES-GCM encryption and let the user's password be the
            // additional data
            await this.datastore.setItem("privateKey", privKeyJWK);

            this.pubKey = keys.publicKey;
            this.pubKeyJWK = await crypto.subtle.exportKey("jwk", this.pubKey);
            delete this.pubKeyJWK["key_ops"];
            await this.datastore.setItem("publicKey", this.pubKeyJWK);
            this.ui.logToConsole(`Public key: ${this.pubKeyJWK.n}`);

            const globalID = await hash(<string>this.pubKeyJWK.n);
            await this.datastore.setItem("gid", globalID);
            this.ui.logToConsole(`Global ID: ${globalID}`);

            this.ui.logToConsole(`Created ID:<br><b>${name}</b>@${globalID}`);
            storages.session.setItem("idmgmt", "reuseid");
        } else if (idmgmt === IdentityTypes.ReuseId) {
            this.ui.logToConsole(`Retrieving stored ID`);
            const globalID = await this.datastore.getItem("gid");
            if (!globalID) {
                this.ui.raiseAlert(
                    `Could not find account for ${name}. Please create an ID instead`
                );
                await this.ui.returnToIndex();
            }

            this.ui.logToConsole(`Restoring ID:<br><b>${name}</b>@${globalID}`);

            this.pubKeyJWK = await this.datastore.getItem("publicKey");
            const privKeyJWK = await this.datastore.getItem("privateKey");

            const loadedKeys = await loadKeys(this.pubKeyJWK!, privKeyJWK!);
            this.pubKey = loadedKeys[0];
            this.privKey = loadedKeys[1];

            this.ui.logToConsole("Rehydrated ID");
        }

        if (idmgmt !== IdentityTypes.Guest) {
            const gid = await this.datastore.getItem("gid");
            this.identity.initialize(name, gid);

            this.ui.logToConsole("Restoring post history");
            await this.postCache.restoreFromStore(this.datastore);

            await this.knownIds.restoreFromStore(this.datastore);
            if (!this.knownIds.has(gid))
                this.knownIds.add(this.identity, this.pubKey!);

            this.renderCache();
        } else {
            this.ui.logToConsole(
                `Registering on network as guest:<br><b>${name}</b>@${id}`
            );
            this.identity.initialize(name, `e'${id}`);
        }
    }

    async onopen(storages: Storages, id: string) {
        this.ui.logToConsole(`Connected to peercloud. Session id is ${id}.`);

        await this.setupIdentity(storages, id);
        this.ui.updateIdentity(this.identity, id);

        this.ui.logToConsole("Accpeting incoming connections.");
        this.peer.on("connection", this.accept.bind(this));
        await this.refreshConnections();

        this.ui.logToConsole("Initialization done.");
        this.ui.disableConsoleMode();

        this._setupResolver!();
    }
}
