export enum IdentityTypes {
    Guest = "guest",
    CreateId = "createid",
    ReuseId = "reuseid",
}

export class Identity {
    name = "";
    id = "";

    isEqual(other: Identity): boolean {
        return this.id === other.id;
    }

    initialize(name: string, id: string) {
        this.name = name;
        this.id = id;
    }
}

interface IdentityCacheEntry {
    ident: Identity;
    publicKey: CryptoKey;
}

export class IdentityCache {
    users: Map<string, IdentityCacheEntry> = new Map(); // id -> (name, pubkey)
    _restored: boolean = false;

    // TODO eventually we'll probably want to expire the entries for ids
    add(ident: Identity, pubkey: CryptoKey) {
        if (this.has(ident.id)) return false;
        this.users.set(ident.id, { ident: ident, publicKey: pubkey });
        return true;
    }

    has(id: string) {
        return this.users.has(id);
    }

    storename() {
        return `IdentityCache`;
    }

    async saveToStore(datastore: any) {
        if (!this._restored) return;
        await datastore.setItem(this.storename(), this.users);
    }

    async restoreFromStore(datastore: any) {
        try {
            const data = await datastore.getItem(this.storename());
            console.log("Restoring", this.storename());
            if (data) {
                data.forEach((v: any, k: string) => {
                    const ident = new Identity();
                    ident.initialize(v.ident.name, v.ident.id);
                    const entry = {
                        ident: ident,
                        publicKey: <CryptoKey>v.publicKey,
                    };
                    this.users.set(k, entry);
                });
            }
        } catch {
            console.log("Restore failed, starting clean.");
            this.users = new Map();
        }

        this._restored = true;
    }
}
