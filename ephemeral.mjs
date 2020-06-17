import {
    digestMessage,
    Identity,
    IdentityCache,
    MessageTypes,
    Post,
    PostCache,
    PostMessage,
    QueryPostMessage,
    QueryPostRespMessage,
    QueryIdentMessage,
    QueryIdentRespMessage,
    RequestPostMessage
} from './objects.mjs'

// settings is loaded in main
let settings = null;

const identity = new Identity();
const knownIds = new IdentityCache();

let currentConnections = 0;

const connectionsMap = new Map();
const potentialPeers = new Set();
const postCache = new PostCache();
const unverifiedPostCache = new PostCache();

let peer = null;
let datastore = null;
let pubKey = null;
let pubKeyJWK = null;
let privKey = null;

const UIElements = {
    activeConnections: null,
    totalConnections: null,
    name: null,
    peer: null,
    posts: null,
    content: null,
    console: null,
};

function enableConsoleMode() {
    UIElements.console.style.display = "";
    UIElements.content.style.display = "none";
}

function logToConsole(msg) {
    UIElements.console.innerHTML += `> ${msg}<br>`;
}

function disableConsoleMode() {
    setTimeout(() => {
        UIElements.console.style.display = "none";
        UIElements.content.style.display = "";
    }, 500);
}

function recvPost(raw) {
    console.log("Recieved post!");
    const post = new Post();
    post.fromJson(raw.post);
    addPost(post);
}

function recvPostQuery(conn, data) {
    conn.send(new QueryPostRespMessage(postCache.postIds));
}

function recvRequestPost(conn, data) {
    if (postCache.has(data.postid)) {
        conn.send(new PostMessage(postCache.posts.get(data.postid)));
    }
}

function recvPostQueryResp(conn, raw) {
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
        unknownPosts.forEach(postid => {
            conn.send(new RequestPostMessage(postid));
        });
    }
}

async function recvQueryIdent(conn, query) {
    console.log(query);
    if (query.id == identity.id) {
        const pubKey = await datastore.getItem('publicKey');
        conn.send(new QueryIdentRespMessage(identity, pubKey));
    } else {
        if (knownIds.has(query.id)) {
            const entry = knownIds.users.get(query.id);
            conn.send(new QueryIdentRespMessage(entry.ident, entry.publicKey));
        } else {
            // TODO forward req to neighbors
        }
    }
}

async function recvQueryIdentResp(resp) {
    const expectedid = await digestMessage(resp.publicKey.n);
    if (resp.ident.id != expectedid)
        return;
    // TODO verify that the publicKey here actually hashes to the id in ident
    if (!knownIds.add(resp.ident, resp.publicKey))
        return;

    console.log(resp);

    // resolve any unverified posts:
    unverifiedPostCache.postIds.forEach(entry => {
        const post = unverifiedPostCache.posts.get(entry.postid);
        console.log("Found unverified post", entry.postid);
        if (post.author.id == resp.ident.id)
            addPost(post);
    });
}

async function recv(conn, data) {
    if (data.type == MessageTypes.POST) {
        recvPost(data);
    } else if (data.type == MessageTypes.QUERYPOSTS) {
        recvPostQuery(conn, data);
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

function updateConnectionsUI() {
    UIElements.totalConnections.innerHTML = potentialPeers.size + currentConnections;
    UIElements.activeConnections.innerHTML = currentConnections;
}

function accept(peer, conn) {
    if ((currentConnections + 1) > settings.maxconnections || connectionsMap.has(conn.peer)) {
        console.log(`Rejecting ${conn.peer}`);
        conn.close();
        return;
    }

    console.log(`Accepting ${conn.peer}`);
    console.log(conn);
    conn.on('error', (e) => {
        console.log("Connection", conn.peer, "encountered error", e);
    });

    conn.on('close', () => {
        // TODO firefox doesn't support this event so we'll need some kind of
        // heartbeat based mechanism as well
        console.log("Connection closed!");
        connectionsMap.delete(conn.peer);
        currentConnections--;
        updateConnectionsUI();
    });

    connectionsMap.set(conn.peer, {conn: conn, open: false, time: (new Date()).getTime()});
    currentConnections++;

    updateConnectionsUI();

    conn.on('open', () => {
        console.log(`Channel with ${conn.peer} opened!`);
        connectionsMap.get(conn.peer).open = true;
        conn.on('data', data => recv(conn, data));
    })
}

function idToColor(id) {
    function hashCode(str) { // java String#hashCode
        var hash = 0;
        for (var i = 0; i < str.length; i++) {
           hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        return hash;
    }

    function intToRGB(i){
        var c = (i & 0x00FFFFFF)
            .toString(16)
            .toUpperCase();

        return "00000".substring(0, 6 - c.length) + c;
    }

    return '#' + intToRGB(hashCode(id));
    // let sum = 0;
    // for (let i = 0; i < id.length; i++) {
    //     sum += id.charCodeAt(i);
    //     sum %= 0xffffff;
    //     console.log("Sum", sum, id.charCodeAt(i));
    // }

    // return '#' + sum.toString(16);
}

async function readJSONfromURL(url) {
    const resp = await fetch(url);
    if (resp.status !== 200)
        throw(`Could not fetch ${url}`);

    let data = "";
    const reader = resp.body.getReader();
    let done = false;
    while (!done) {
        let body = await reader.read();
        if (!body.value) {
            done = true;
        } else {
            data += String.fromCharCode.apply(null, body.value);
        }
    }
    return JSON.parse(data);
}

async function refreshConnections(peer) {
    while (currentConnections < settings.maxconnections) {
        // scan through potential connections and connect to them
        if (potentialPeers.size) {
            console.log("Found potential peer");
            // connect to 1 peer to start with
            peerid = potentialPeers.keys().next().value;
            potentialPeers.delete(peerid);

            console.log(`Establishing connection with ${peerid}`, potentialPeers);
            const conn = peer.connect(peerid);
            accept(peer, conn);
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
            peerList.forEach(peerid => {
                if (peerid != peer.id && !connectionsMap.has(peerid)) {
                    potentialPeers.add(peerid);
                    addedPeers++;
                }
            });

            if (addedPeers == 0)
                break;
        }
    }
}

const algorithm = {
    name: "RSASSA-PKCS1-v1_5",
    hash: {name: "SHA-256"}
};
const usages = ["sign", "verify"];

async function setupIdentity(id) {
    const name = sessionStorage.getItem("name") || id;
    datastore = localforage.createInstance({name: name});

    const idmgmt = sessionStorage.getItem("idmgmt") || "guest";
    if (idmgmt == "createid") {
        logToConsole("Searching for existing identity");
        const testID = await datastore.getItem('gid');
        if (testID) {
            const input = prompt(
                `Warning! Found an existing identity for ${name}. Please type "${name}" to confirm deletion.`);
            console.log("Got input", input, name);
            if (input != name) {
                console.log("reloading");
                window.location = "../";
                // give time for the reload to take place
                await (new Promise(r => setTimeout(r, 1 * 60 * 60 * 1000)));
            }

            console.log("deleting");
            logToConsole("Deleting old identity.");
            await datastore.clear();
        }

        logToConsole("Creating new identity.");
        logToConsole("Generating RSA keys.");
        const keyParams = {
            ...algorithm,
            modulusLength: 4096,
            publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
        };
        const keys = await crypto.subtle.generateKey(keyParams, true, ["sign", "verify"]);
        logToConsole("Done generating RSA keys.");

        privKey = keys.privateKey;
        const privKeyJWK = await crypto.subtle.exportKey("jwk", privKey);
        delete privKeyJWK["key_ops"]
        // TODO encrypt this key w/ a password
        // could use AES-GCM encryption and let the user's password be the
        // additional data
        await datastore.setItem('privateKey', privKeyJWK);

        pubKey = keys.publicKey;
        pubKeyJWK = await crypto.subtle.exportKey("jwk", pubKey);
        delete pubKeyJWK["key_ops"]
        console.log("Generated public key", pubKeyJWK);
        await datastore.setItem('publicKey', pubKeyJWK);
        logToConsole(`Public key: ${pubKeyJWK.n}`);

        const globalID = await digestMessage(pubKeyJWK.n);
        console.log("gid", globalID);
        await datastore.setItem('gid', globalID);
        logToConsole(`Global ID: ${globalID}`);

        logToConsole(`Created ID:<br><b>${name}</b>@${globalID}`);
        sessionStorage.setItem("idmgmt", "reuseid")
    } else if (idmgmt == "reuseid") {
        // TODO check if there really is an ID for the given name
        logToConsole(`Retrieving stored ID`);
        const globalID = await datastore.getItem('gid');
        if (!globalID) {
            setTimeout(() => {
                window.location = "../";
            }, 1000);
            alert(`Could not find account for ${name}. Please create an ID instead`);
        }

        logToConsole(`Restoring ID:<br><b>${name}</b>@${globalID}`);
        pubKeyJWK = await datastore.getItem('publicKey');
        pubKey = await crypto.subtle.importKey('jwk', pubKeyJWK, algorithm, true, ["verify"]);

        const privKeyJWK = await datastore.getItem('privateKey');
        privKey = await crypto.subtle.importKey('jwk', privKeyJWK, algorithm, true, ["sign"]);
        logToConsole("Rehydrated ID");
    }

    if (idmgmt != "guest") {
        identity.initialize(name, await datastore.getItem('gid'));
    } else {
        logToConsole(`Registering on network as guest:<br><b>${name}</b>@${id}`);
        identity.initialize(name, `e'${id}`);
    }
}

async function onopen(peer, id) {
    logToConsole(`Connected to peercloud. Session id is ${id}.`);

    await setupIdentity(id);

    UIElements.id.innerHTML = identity.id;
    UIElements.id.style.color = idToColor(identity.id);
    UIElements.name.innerHTML = identity.name;
    UIElements.peerid.innerHTML = id;

    logToConsole("Accpeting incoming connections.");
    peer.on('connection', c => accept(peer, c));
    await refreshConnections(peer);

    logToConsole("Initialization done.");
    disableConsoleMode();
}

function broadcast(msg) {
    connectionsMap.forEach(channel => {
        if (channel.open) {
            channel.conn.send(msg)
        } else {
            if (((new Date()).getTime() - channel.time) > settings.connectiontimeout) {
                console.log("Purging", channel.conn.peer);
                connectionsMap.delete(channel.conn.peer);
                updateConnectionsUI();
            }
        }
    });
}

function verifyPost(post) {
    if (post.author.id == identity.id || post.author.id.startsWith("e'"))
        return true;

    if (knownIds.has(post.author.id)) {
        // TODO verify a signature on a post
        return true;
    } else {
        // TODO broadcast until a response is recieved or the post times out
        broadcast(new QueryIdentMessage(post.author.id));
        return null;
    }

    return false;
}

function createAuthorNameTag(ident) {
    const author = document.createElement('div');
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

function addPost(post) {
    if (postCache.has(post.id)) {
        return;
    }

    const verificationState = verifyPost(post);
    if (verificationState == null) {
        unverifiedPostCache.add(post);
        return;
    } else
        unverifiedPostCache.remove(post.id);

    if (!verificationState)
        return;

    postCache.add(post);

    const newPost = document.createElement('div');
    newPost.classList.add("post");

    const author = createAuthorNameTag(post.author);
    const contents = document.createElement('div');
    contents.classList.add("post-contents");
    contents.innerHTML = post.contents;

    newPost.appendChild(author);
    newPost.appendChild(contents);

    // Make the newest posts the first child. In the future we'll want to
    // chronologically sort or something. Will probably need to dynamically
    // render by querying the cache for a time range.
    UIElements.posts.insertBefore(newPost, UIElements.posts.childNodes[0]);
}


function setupUI() {
    UIElements.activeConnections = document.getElementById("activeconnections");
    UIElements.activeConnections.addEventListener('click', () => {
        console.log(connectionsMap);
    });

    UIElements.totalConnections = document.getElementById("totalconnections");
    UIElements.activeConnections.addEventListener('click', () => {
        console.log(potentialPeers);
    });

    UIElements.name = document.getElementById("name");
    UIElements.id = document.getElementById("id");
    UIElements.peerid = document.getElementById("peerid");
    UIElements.posts = document.getElementById("posts");
    UIElements.content = document.getElementById("content");
    UIElements.console = document.getElementById("console");


    // These two elements aren't needed outside this scope
    const postInput = document.getElementById("post-input");
    const postSubmit = document.getElementById("post-submit");
    postSubmit.onclick = async () => {
        const post = new Post(identity, postInput.value);
        await post.initialize();
        addPost(post);

        // Broadcast new post
        broadcast(new PostMessage(post));
        postInput.value = "";
    };

    enableConsoleMode();
}

function queryPosts() {
    // TODO use a random stream pick k elements algorithm instead of querying
    // all conns
    broadcast(new QueryPostMessage());
}

async function main() {
    settings = await readJSONfromURL('./settings.json');

    setupUI();

    logToConsole("Setting up initial state");
    logToConsole("Connecting to peercloud");

    peer = new Peer(
        {
            host: settings.peercloud.host,
            port: settings.peercloud.port,
            path: settings.peercloud.path,
            config: {'iceServers': [{ 'urls': 'stun:stun.l.google.com:19302' }]}
        });
    logToConsole("Waiting for peercloud response");
    peer.on('open', id => onopen(peer, id));
    peer.on('error', (e) => {
        // TODO reenable this error when necessary
        // alert("Could not connect to peercloud\n" + e + `\nid: ${peer.id}`);
        // throw new Error(e);
    });

    setInterval(queryPosts, settings.intervals.queryposts);
    setInterval(() => { refreshConnections(peer); }, settings.intervals.refreshconnections);
    setInterval(() => { unverifiedPostCache.prune() }, settings.intervals.prunecache);
    setInterval(() => { postCache.prune() }, settings.intervals.prunecache);
}

document.addEventListener('DOMContentLoaded', main);
