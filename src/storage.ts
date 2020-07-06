export interface DatabaseParams {
    name: string;
}

export interface Database {
    createInstance: (params: DatabaseParams) => DatabaseStorage;
}

export interface DatabaseStorage {
    getItem: (key: string) => Promise<any>;
    setItem: (key: string, value: any) => Promise<void>;
    clear: () => Promise<void>;
}

export interface Storages {
    session: Storage;
    database: Database;
}
