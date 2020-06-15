import {
    Identity,
    MessageTypes,
    Post,
    PostCache,
    PostMessage,
    QueryPostMessage,
    QueryPostRespMessage,
    RequestPostMessage
} from './objects.mjs'

const identity = new Identity();

const PeerCloud = {
    host: "localhost",
    port: "9000",
    path: "peerserver"
};

const MaxConnections = 10;
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
};

function recvPost(raw) {
    console.log("Recieved post!");
    const post = new Post();
    post.fromJson(raw.post);
    addPost(post);
}

function recvPostQuery(conn, data) {
    console.log("Got post query");
    conn.send(new QueryPostRespMessage(postCache.postIds));
}

function recvRequestPost(conn, data) {
    if (postCache.has(data.postid)) {
        conn.send(new PostMessage(postCache.posts.get(data.postid)));
    }
}

function recvPostQueryResp(conn, raw) {
    // TODO make sure that we are waiting for this resp on this connection
    console.log("Got post query resp");
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
    if ((currentConnections + 1) > MaxConnections) {
        console.log(`Rejecting ${conn.peer}`);
        conn.close();
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
    let sum = 0;
    for (let i = 0; i < id.length; i++) {
        sum += id.charCodeAt(i);
        sum %= 0xffffff;
    }

    return '#' + sum.toString(16);
}

async function refreshConnections(peer) {
    while (currentConnections < MaxConnections) {
        // scan through potential connections and connect to them
        if (potentialPeers.size) {
            // connect to 1 peer to start with
            peerid = potentialPeers.keys().next().value;
            potentialPeers.delete(peerid);

            console.log(`Establishing connection with ${peerid}`, potentialPeers);
            const conn = peer.connect(peerid);
            accept(peer, conn);
            break;
        } else {
        // if there are no potential connections, fetch from the peerserver
           const url = `https://${PeerCloud.host}:${PeerCloud.port}/${PeerCloud.path}/peerjs/peers`;
            const resp = await fetch(url);
            if (resp.status !== 200)
                throw("Could not list peers");

            let peerList = "";
            const reader = resp.body.getReader();
            let done = false;
            while (!done) {
                let body = await reader.read();
                if (!body.value) {
                    done = true;
                } else {
                    peerList += String.fromCharCode.apply(null, body.value);
                }
            }
            peerList = JSON.parse(peerList);
            peerList.forEach(peerid => {
                if (peerid != identity.id)
                    potentialPeers.add(peerid);
            });

            if (peerList.length <= 1)
                break;
        }
    }
}

async function onopen(peer, id) {
    console.log("Connected to peercloud:", id);
    // const params = new URLSearchParams(location.search);
    // TODO allow persistant IDs that use localstorage along with public keys to
    // assume the same identity across sessions independant of session id.

    const name = prompt('username:') || id;
    identity.initialize(name, id);

    UIElements.peer.innerHTML = id;
    UIElements.peer.style.color = idToColor(id);
    UIElements.name.innerHTML = name;

    peer.on('connection', c => accept(peer, c));
    await refreshConnections(peer);
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
}

function queryPosts() {
    // TODO use a random stream pick k elements algorithm instead of querying
    // all conns
    const msg = new QueryPostMessage();
    connectionsMap.forEach(conn => conn.send(msg));
}

function main() {
    setupUI();

    console.log("Creating peer");
    peer = new Peer(
        {
            host: PeerCloud.host,
            port: PeerCloud.port,
            path: PeerCloud.path,
            config: {'iceServers': [{ 'urls': 'stun:stun.l.google.com:19302' }]}
        });
    console.log("Created peer - connecting to peercloud");
    peer.on('open', id => onopen(peer, id));
    peer.on('error', (e) => {
        alert("Could not connect to peercloud\n" + e);
        // TODO reenable this error
        // throw new Error(e);
    });

    setInterval(queryPosts, 5000);
    setInterval(refreshConnections, 60 * 1000);
    setInterval(() => { postCache.prune() }, 1 * 60 * 60 * 1000);
}

document.addEventListener('DOMContentLoaded', main);
