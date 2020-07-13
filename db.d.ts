import * as JsStore from "jsstore";
import { ITable } from "jsstore";
export interface JsDBConn extends JsStore.Connection {
}
export declare function getWorker(): Worker;
export interface DatabaseInterface {
    initialize: () => Promise<boolean>;
    clear: () => void;
}
export declare class Database {
    suffix: string;
    schemas: ITable[];
    conn: JsDBConn;
    _prefix: string;
    get dbname(): string;
    constructor(conn: JsDBConn | null, name: string);
    initialize(): Promise<boolean>;
    clear(): Promise<void>;
}
