import {JsDBConn} from "./db";

export interface DatabaseParams {
    name: string;
}

export interface Storages {
    session: Storage;
    userDBConn: JsDBConn;
    postDBConn: JsDBConn;
}
