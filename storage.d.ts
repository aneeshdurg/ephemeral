import { JsDBConn } from "./db";
import * as Id from "./identity";
import * as Post from "./post";
export interface DatabaseParams {
    name: string;
}
export interface Storages {
    session: Storage;
    userDBConn: JsDBConn | null;
    userDBConstructor: Id.DatabaseConstructor;
    postDBConn: JsDBConn | null;
    postDBConstructor: Post.DatabaseConstructor;
    verifiedPostDBConstructor: Post.PostDatabaseConstructor;
    unverifiedPostDBConstructor: Post.PostDatabaseConstructor;
}
