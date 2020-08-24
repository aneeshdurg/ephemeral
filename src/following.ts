import { Connection } from "./client";

interface FollowingEntry {
    conn: Connection;
    backups: Array<Connection>;
}

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
}
