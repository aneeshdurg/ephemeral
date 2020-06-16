import {
    digestMessage,
    Identity,
    PersistantIdentity,
    MessageTypes,
    Post,
    PostCache,
    PostMessage,
    QueryPostMessage,
    QueryPostRespMessage,
    RequestPostMessage
} from './objects.mjs'

// settings is loaded in main
let settings = null;

const identity = new Identity();

let currentConnections = 0;

const connectionsMap = new Map();
const potentialPeers = new Set();
const postCache = new PostCache();

let peer = null;

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
    // TODO have the postcache use localForage to persistantly store posts
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
        if (postCache.has(raw.posts[i].postid))
            continue;
        unknownPosts.push(raw.posts[i].postid);
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

function recv(conn, data) {
    if (data.type == MessageTypes.POST) {
        recvPost(data);
    } else if (data.type == MessageTypes.QUERYPOSTS) {
        recvPostQuery(conn, data);
    } else if (data.type == MessageTypes.QUERYPOSTSRESP) {
        recvPostQueryResp(conn, data);
    } else if (data.type == MessageTypes.REQUESTPOSTS) {
        recvRequestPost(conn, data);
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

    conn.on('close', () => {
        // TODO firefox doesn't support this event so we'll need some kind of
        // heartbeat based mechanism as well
        console.log("Connection closed!");
        connectionsMap.delete(conn.peer);
        currentConnections--;
        updateConnectionsUI();
    });

    connectionsMap.set(conn.peer, conn);
    currentConnections++;

    updateConnectionsUI();

    conn.on('open', () => {
        console.log(`Channel with ${conn.peer} opened!`);
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
    console.log("Refreshing connections");
    while (currentConnections < settings.maxconnections) {
        console.log("Scanning connections");
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
            console.log("Querying peercloud");
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

async function setupIdentity(id) {
    const name = sessionStorage.getItem("name") || id;
    const idmgmt = sessionStorage.getItem("idmgmt") || "guest";
    if (idmgmt == "createid") {
        logToConsole("Creating new identity.");

        logToConsole("Generating RSA keys.");
        const store = localforage.createInstance({name: name});
        const keyParams = {
            name: "RSASSA-PKCS1-v1_5",
            modulusLength: 4096,
            publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
            hash: "SHA-256"
        };
        const keys = await crypto.subtle.generateKey(keyParams, true, ["sign", "verify"]);
        logToConsole("Done generating RSA keys.");

        const privKey = await crypto.subtle.exportKey("jwk", keys.privateKey);
        // TODO encrypt this key w/ a password
        // could use AES-GCM encryption and let the user's password be the
        // additional data
        await localforage.setItem('privateKey', privKey);

        const pubKey = await crypto.subtle.exportKey("jwk", keys.publicKey);
        console.log("Generated public key", pubKey);
        localforage.setItem('publicKey', pubKey);
        logToConsole(`Public key: ${pubKey.n}`);

        const globalID = await digestMessage(pubKey.n);
        console.log("gid", globalID);
        localforage.setItem('gid', globalID);
        logToConsole(`Global ID: ${globalID}`);

        logToConsole(`Created ID:<br><b>${name}</b>@${globalID}`);
        sessionStorage.setItem("idmgmt", "reuseid")
    } else if (idmgmt == "reuseid") {
        // TODO check if there really is an ID for the given name
        logToConsole(`Retrieving stored ID`);
        const globalID = await localforage.getItem('gid');
        logToConsole(`Restoring ID:<br><b>${name}</b>@${globalID}`);
    }

    if (idmgmt != "guest") {
        // TODO store pub/priv keys as global vars
        identity.initialize(name, await localforage.getItem('gid'));
    } else {
        logToConsole(`Registering on network as guest:<br><b>${name}</b>@${id}`);
        identity.initialize(name, `e'${id}`);
    }
}

async function onopen(peer, id) {
    logToConsole(`Connected to peercloud. Session id is ${id}.`);

    await setupIdentity(id);

    UIElements.peer.innerHTML = identity.id;
    UIElements.peer.style.color = idToColor(identity.id);
    UIElements.name.innerHTML = identity.name;

    logToConsole("Accpeting incoming connections.");
    peer.on('connection', c => accept(peer, c));
    await refreshConnections(peer);

    logToConsole("Initialization done.");
    disableConsoleMode();
}

function addPost(post) {
    if (!postCache.add(post))
        return;

    const newPost = document.createElement('div');
    newPost.classList.add("post");

    const author = document.createElement('div');
    author.classList.add("post-author");
    // TODO make this element more complex w/ username color + hoverover for id
    // details etc.
    author.innerHTML = `<b>${post.author.name}</b>:`;
    author.title = `${post.author.name}@${post.author.id}`;
    author.style.color = idToColor(post.author.id);
    author.dataset.expanded = "";
    author.onclick = () => {
        if (author.dataset.expanded) {
            author.innerHTML = `<b>${post.author.name}</b>:`;
            author.dataset.expanded = "";
        } else {
            author.innerHTML = `<b>${post.author.name}</b>@${post.author.id}:`;
            author.dataset.expanded = "true";
        }
    };

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
    UIElements.totalConnections = document.getElementById("totalconnections");
    UIElements.name = document.getElementById("peername");
    UIElements.peer = document.getElementById("peerid");
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
        const msg = new PostMessage(post);
        connectionsMap.forEach(conn => conn.send(msg));

        postInput.value = "";
    };

    enableConsoleMode();
}

function queryPosts() {
    // TODO use a random stream pick k elements algorithm instead of querying
    // all conns
    const msg = new QueryPostMessage();
    connectionsMap.forEach(conn => conn.send(msg));
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
        alert("Could not connect to peercloud\n" + e);
        // TODO reenable this error
        // throw new Error(e);
    });

    setInterval(queryPosts, settings.intervals.queryposts);
    setInterval(() => { refreshConnections(peer); }, settings.intervals.refreshconnections);
    setInterval(() => { postCache.prune() }, settings.intervals.prunecache);
}

document.addEventListener('DOMContentLoaded', main);
