import * as JsStore from "jsstore";
import { ITable } from "jsstore";

export interface JsDBConn extends JsStore.Connection {}

export function getWorker() {
    return new Worker(
        (() => {
            if (process.env.NODE_ENV === "development") {
                return "./ext_scripts/jsstore.worker.js";
            } else {
                return "./ext_scripts/jsstore.worker.min.js";
            }
        })()
    );
}

export interface DatabaseInterface {
    initialize: () => Promise<boolean>;
    clear: () => void;
}

// TODO create 2 DBConn, one for user logic and one for post logic
export class Database {
    suffix: string = "";
    schemas: ITable[] = [];

    conn: JsDBConn;

    _prefix: string;
    get dbname() {
        // TODO prevent ':' in username
        return `${this._prefix}::${this.suffix}`;
    }

    constructor(conn: JsDBConn | null, name: string) {
        if (!conn) throw new Error("Database requires a valid conn");
        this.conn = conn!;
        this._prefix = name;
    }

    async initialize(): Promise<boolean> {
        return await this.conn.initDb({
            name: this.dbname,
            tables: this.schemas,
        });
    }

    async clear() {
        // consider using dropDb instead
        this.schemas.forEach((schema) => {
            this.conn.clear(schema.name);
        });
    }
}
