import { Connection } from "./client";

/**
 * The basic idea of the follower system is to have a tree of followers, with
 * the user being followed at the root.
 *
 * Follower workflow
 *
 * The below assumes the user being followed (followee) is online. In the case
 * where the user is offline, we need some way to join the follower tree.
 * Support for this will be added later.
 *
 *
 * follower "follows" followee
 * Case 1 - follower is connected to followee
 *     follower sends follow request to followee
 *     Case 1: Followee acks request
 *     Case 2: Followee nacks request with a id of some other client that can
 *     provide updates instead
 *         Follower connects to Follower B
 *         Follower B can ack/nack. Repeat until a succesful connection is
 *         established.
 *
 *         Success is guaranteed since the follwers model a tree.
 * Case 2 - follower is not connected to followee
 *     follower asks network if anyone knows someone in the follow tree.
 *     Case 1: Some client responds with an id to connect to
 *         The process detailed above for joining the tree is followed
 *      Case 2: No one knows about the user wanting to be followed
 *          Fail the request. In the future the offline strategy will be used
 *
 * Now the follower recieves (and is responsible for sending  to children):
 *     Updates when the followee makes a post
 *     Potential requests to connect if a new follower appears
 *         If this client has reached maximum connections, redirect to a
 *         another directly connected follower
 *     Migrate message where the parent in this follower tree asks this
 *     client to connect to a different client instead.
 *
 * Before logging out the follower must update it's parent and all
 * children to instruct them to either stop pointing new clients to this
 * client or to find a new parent respectively.
 *
 * Offline strategy:
 *     Every node maintains a Map of some random collection of users to a peerjs
 *     ids corresponding to a user that is in the followingtree . This map will
 *     be periodically updated and pruned randomly. In order to have some amount
 *     of stability in this system, we will need some "Supernodes" that have
 *     stronger guarantees (i.e. they promise not to leave unexpectedly and have
 *     a longer lifespan) and store larger maps.  This will kind of act like
 *     DDNS.
 */

interface FollowingEntry {
    conn: Connection;
    backups: Array<Connection>;
};

export class FollowingSystem {
    // Users that the current client is following.
    // TODO rehydrate this from the cache
    following: Set<string> = new Set();

    // Connections where this client will recieve updates for each client they
    // are following.
    followingMap: Map<String, FollowingEntry> = new Map();

    /**
     * ID of user being followed -> followers
     * The values in this map are followers who are listening to this client for
     * updates. The user being followed can be this client itself.
     */
    followingParticipantMap: Map<string, Array<Connection>> = new Map();

    // "DNS" for the follwing system. Maps ID to peerjs id
    phonebook: Map<String, String> = new Map();

    constructor() {
        // TODO
    }

    rehydrateFollowing(follwing: Set<string>) {
        this.following = following;
    }

    saveFollwing() {
        // TODO
    }


    follow(string: id, connection: Connection | null) {
        // If we already have a connection we can just use that and send a
        // follower request.
    }

}
