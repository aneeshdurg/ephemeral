import Peer from "peerjs";

import * as Msg from "./messages";
import { UIElements } from "./ui";
import * as CryptoLib from "./crypto";
import {
    IdDBInterface,
    Identity,
    IdentityTypes,
    createIdentity,
} from "./identity";
import {
    Post,
    PostDBInterface,
    PostVerificationState,
} from "./post";
import { Storages } from "./storage";
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

    unknownIds: Set<string> = new Set();
    _knownIds: IdDBInterface | null = null;
    get knownIds() {
        return this._knownIds!;
    }

    // TODO add "transiantConnections" which represents connections established
    // to send a response to a query
    connectionsMap: ConnectionMap = new Map();
    potentialPeers: Set<string> = new Set();

    // TODO run PostCache into PostDB that contains two tables, one for verified
    // and one for unverified.
    _postCache: PostDBInterface | null = null;
    get postCache(): PostDBInterface {
        return this._postCache!;
    }

    _unverifiedPostCache: PostDBInterface | null = null;
    get unverifiedPostCache(): PostDBInterface {
        return this._unverifiedPostCache!;
    }

    // TODO add types for peer and datastore
    _peer: Peer | null = null;
    get peer(): Peer {
        return this._peer!;
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
                throw new Error("Socket Error 1 " + e);
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
                throw new Error("Socket Error 2 " + e);
            } else if (e.type == "webrtc") {
                // Native WebRTC errors.
                this.ui.raiseAlert("Network error");
                throw new Error("Socket Error 3 " + e);
            }
            // TODO on disconnect create a new peer
        });

        function queryPosts() {
            // TODO use a random stream pick k elements algorithm instead of querying
            // all conns
            that.broadcast(new Msg.QueryPostMessage());
        }
        this.setInterval(queryPosts, this.settings.intervals.queryposts);

        function queryIdents() {
            that.unknownIds.forEach((id) => {
                that.broadcast(new Msg.QueryIdentMessage(id));
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
        this.broadcast(new Msg.PostMessage(post));
        // TODO don't broadcast replies and implement a query method for
        // retrieving post replies
        return post;
    }

    // Add a post to the cache and render it
    async addPost(post: Post, trusted: boolean) {
        if (await this.postCache.has(post.id)) {
            return;
        }

        const verificationState = trusted
            ? PostVerificationState.SUCCESS
            : await post.verifyOwnership(this.knownIds);
        if (verificationState == PostVerificationState.PENDING) {
            await this.unverifiedPostCache.add(post);
            this.unknownIds.add(post.author.id);
            this.broadcast(new Msg.QueryIdentMessage(post.author.id));
        } else await this.unverifiedPostCache.remove(post.id);

        if (verificationState != PostVerificationState.SUCCESS) return;

        // TODO sort by the post's timestamp
        if (this.ui.renderPost(post, post.isOwnedBy(this.identity))) {
            await this.postCache.add(post);
        }
    }

    broadcast(msg: Msg.Message, exclude_?: Set<string>) {
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

    async recvPostQuery(conn: any) {
        // TODO only send new postids newer than the last time we responded to
        // QueryPost on this connection
        const cachedIds = await this.postCache.getAllPostIds();
        conn.send(new Msg.QueryPostRespMessage(cachedIds));
    }

    async recvRequestPost(conn: any, data: any) {
        if (await this.postCache.has(data.postid)) {
            const post = await this.postCache.get(data.postid);
            conn.send(new Msg.PostMessage(post));
        }
    }

    async recvPostQueryResp(conn: any, raw: any) {
        // TODO make sure that we are waiting for this resp on this connection
        const unknownPosts = [];
        for (let i = 0; i < raw.posts.length; i++) {
            const postid = raw.posts[i];
            if (
                await this.postCache.has(postid) ||
                await this.unverifiedPostCache.has(postid)
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
                conn.send(new Msg.RequestPostMessage(postid));
            });
        }
    }

    async recvQueryIdent(conn: any, query: any) {
        if (query.id == this.identity.id) {
            conn.send(
                new Msg.QueryIdentRespMessage(this.identity, this.pubKeyJWK!)
            );
        } else {
            if (await this.knownIds.has(query.id)) {
                const entry = await this.knownIds.get(query.id);
                conn.send(new Msg.QueryIdentRespMessage(entry.ident, entry.pubKeyJWK));
            } else if (!this.unknownIds.has(query.id)) {
                this.unknownIds.add(query.id);
                // Ask neighbors except the one that asked
                this.broadcast(
                    new Msg.QueryIdentMessage(query.id),
                    new Set([conn.peer])
                );
            }
        }
    }

    // TODO turn all messages into interfaces instead of classes
    async recvQueryIdentResp(resp: any) {
        if (await this.knownIds.has(resp.ident.id)) return;

        const expectedid = await CryptoLib.hash(resp.publicKey.n);
        if (resp.ident.id != expectedid) return;

        const ident = new Identity();
        ident.initialize(resp.ident.name, resp.ident.id);
        this.knownIds.add(ident, resp.publicKey);
        this.unknownIds.delete(resp.ident.id);

        // resolve any unverified posts:
        // TODO optimize this by using JsStore queries
        const outstandingPosts = await this.unverifiedPostCache.getAllPostIds();
        outstandingPosts.forEach(async (postid: string) => {
            const post = await this.unverifiedPostCache.get(postid);
            console.log("Found unverified post", postid);
            if (post.author.id == resp.ident.id)
                await this.addPost(post, false);
        });
    }

    async recv(conn: any, data: any) {
        if (data.type == Msg.MessageTypes.POST) {
            await this.recvPost(data);
        } else if (data.type == Msg.MessageTypes.QUERYPOSTS) {
            this.recvPostQuery(conn);
        } else if (data.type == Msg.MessageTypes.QUERYPOSTSRESP) {
            this.recvPostQueryResp(conn, data);
        } else if (data.type == Msg.MessageTypes.REQUESTPOSTS) {
            this.recvRequestPost(conn, data);
        } else if (data.type == Msg.MessageTypes.QUERYIDENT) {
            await this.recvQueryIdent(conn, data);
        } else if (data.type == Msg.MessageTypes.QUERYIDENTRESP) {
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

    async renderCache() {
        // TODO sort by the post's timestamp
        const postIds = await this.postCache.getAllPostIds();
        postIds.forEach(async (postid: string) => {
            const post = await this.postCache.get(postid);
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

        const guestDbName = `guest::${id}`;

        if (idmgmt !== IdentityTypes.Guest) {
            this.ui.logToConsole("Retrieving datastore");
            this._knownIds = new storages.userDBConstructor(
                storages.userDBConn,
                name
            );
            await this.knownIds.initialize();
        } else {
            // need to set all the DBs to be some in memory datastore
            this._knownIds = new storages.userDBConstructor(
                storages.userDBConn,
                guestDbName
            );
            await this.knownIds.initialize();
            await this.knownIds.clear();
        }

        if (idmgmt === IdentityTypes.CreateId) {
            // TODO check this via Db.conn.getDbList before even initializing
            // the db
            this.ui.logToConsole("Searching for existing identity");
            const testID = await this.knownIds.getGid();
            console.log(this.knownIds, testID);
            if (testID) {
                const cancelled = await this.ui.raiseConfirmDelete(name);
                if (cancelled) await this.ui.returnToIndex();

                console.log("deleting");
                this.ui.logToConsole("Deleting old identity.");
                await this.knownIds.clear();
            }

            const createdIdent = await createIdentity(this.ui, name);

            this.pubKey = createdIdent.pubKey;
            this.pubKeyJWK = createdIdent.pubKeyJWK;
            this.privKey = createdIdent.privKey;
            this.identity = createdIdent.identity;

            // TODO encrypt this key w/ a password
            // could use AES-GCM encryption and let the user's password be the
            // additional data
            await this.knownIds.insertUser({
                id: this.identity.id,
                name: name,
                pubKey: this.pubKeyJWK,
                privKey: createdIdent.privKeyJWK,
                isSelf: "true",
            });
            storages.session.setItem("idmgmt", "reuseid");
        } else if (idmgmt === IdentityTypes.ReuseId) {
            this.ui.logToConsole(`Retrieving stored ID`);
            const globalID = await this.knownIds.getGid();
            if (!globalID) {
                await this.ui.raiseAlert(
                    `Could not find account for ${name}. Please create an ID instead`
                );
                await this.ui.returnToIndex();
            }

            this.ui.logToConsole(`Restoring ID:<br><b>${name}</b>@${globalID}`);

            this.pubKeyJWK = await this.knownIds.getSelfPubJWK();
            const privKeyJWK = await this.knownIds.getSelfPrivJWK();

            const loadedKeys = await CryptoLib.loadKeys(
                this.pubKeyJWK!,
                privKeyJWK!
            );
            this.pubKey = loadedKeys[0];
            this.privKey = loadedKeys[1];

            this.identity.initialize(name, globalID!);
            this.ui.logToConsole("Rehydrated ID");
        }

        const postCacheBase = new storages.postDBConstructor(
            storages.postDBConn,
            (idmgmt !== IdentityTypes.Guest) ?  name : guestDbName
        );
        await postCacheBase.initialize();
        if (idmgmt === IdentityTypes.Guest)
            await postCacheBase.clear()

        this._postCache = new storages.verifiedPostDBConstructor(postCacheBase);
        this._unverifiedPostCache = new storages.unverifiedPostDBConstructor(
            postCacheBase
        );

        if (idmgmt !== IdentityTypes.Guest) {
            this.ui.logToConsole("Restoring post history");
            await this.renderCache();
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
