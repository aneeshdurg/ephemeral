import * as JsStore from 'jsstore';
import { ITable } from 'jsstore';

import {IdColumn} from "./identity.ts";

export interface JsDBConn extends JsStore.Connection { }

export function getWorker() {
    return new Worker((() => {
        if (process.env.NODE_ENV === 'development') {
            return require("./ext_scripts/jsstore.worker.js");
        }
        else {
            return require("./ext_scripts/jsstore.worker.min.js");
        }
    })());
}

// TODO create 2 DBConn, one for user logic and one for post logic
export class Database {
    conn: JsDBConn;
    dbname: string;

    schemas: ITable[] = [];

    waitForSetup: Promise<boolean>;

    constructor(conn: JsDBConn, dbname: string) {
        this.conn = conn;
        this.dbname = dbname;

        this.waitForSetup = this.conn.initDb({
            name: this.dbname,
            tables: this.schemas
        });
    }

    async clear() {
        // consider using dropDb instead
        this.schemas.forEach((schema) => {
            this.conn.clear(schema.name);
        });
    }
}
