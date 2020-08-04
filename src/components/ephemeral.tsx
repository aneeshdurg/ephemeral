import * as JsStore from "jsstore";
import * as React from "react";

import PostEditor from "./postEditor";
import PostList, {FilterCB} from "./postList";
import Alert from "./alert";
import ConfirmDeletion from "./confirmDeletion";
import { ConnectionsUpdaterCB, IdentUpdaterCB } from "./connections";


import settings from "../settings/settings";
import * as Db from "../db";
import * as Id from "../identity";
import * as Post from "../post";
import { Client } from "../client";
import { UIElements, AddPostCB } from "../ui";

interface ConfirmDeleteParams {
    name: string;
    callback: (cancelled: boolean) => void;
}

interface AlertParams {
    contents: string;
    callback: () => void;
}

interface EphemeralState {
    alertParams: AlertParams | null;
    consoleMode: boolean;
    confirmDeleteParams: ConfirmDeleteParams | null;
}

interface EphemeralProps {
    onLogout: () => void;
    getDestroy: (d: () => void) => void;
    updateConns: ConnectionsUpdaterCB;
    updateIdent: IdentUpdaterCB;
}

export default class Ephemeral extends React.Component<EphemeralProps, EphemeralState> {
    renderPost: AddPostCB | null = null;
    setFilter: FilterCB | null = null;
    _client: Client | null = null;
    consoleRef: React.RefObject<HTMLDivElement> = React.createRef();
    searchRef: React.RefObject<HTMLInputElement> = React.createRef();

    get client(): Client {
        return this._client!;
    }

    constructor(props: EphemeralProps) {
        super(props);
        this.state = {
            alertParams: null,
            consoleMode: false,
            confirmDeleteParams: null,
        };

        const that = this;
        this.props.getDestroy(() => {
            that.client.destroy();
        });
    }

    enableConsoleMode() {
        console.log("turning on console mode");
        this.setState((state) => {
            return { ...state, consoleMode: true };
        });
    }

    disableConsoleMode() {
        console.log("turning off console mode");
        this.setState((state) => {
            return { ...state, consoleMode: false };
        });
    }

    raiseConfirmDelete(name: string, callback: (b: boolean) => void) {
        this.setState((state) => {
            return {
                ...state,
                confirmDeleteParams: {
                    name: name,
                    callback: callback,
                },
            };
        });
    }

    clearConfirmDelete() {
        this.setState((state) => {
            return { ...state, confirmDeleteParams: null };
        });
    }

    raiseAlert(contents: string, callback: () => void) {
        this.setState((state) => {
            return {
                ...state,
                alertParams: {
                    contents: contents,
                    callback: callback,
                },
            };
        });
    }

    clearAlert() {
        this.setState((state) => {
            return { ...state, alertParams: null };
        });
    }

    getAddPost(addPost: AddPostCB) {
        this.renderPost = addPost;
    }

    getSetFilter(setFilter: FilterCB) {
        this.setFilter = setFilter;
    }

    async addPost(contents: string, parent: string | null) {
        await this.client.postCB(contents, parent);
    }

    async editPost(contents: string, post: Post.Post) {
        await this.client.editCB(contents, post);
    }

    componentDidMount() {
        this._client = new Client(
            new UIElements({
                renderPost: this.renderPost!,
                updateConns: this.props.updateConns,
                updateIdent: this.props.updateIdent,
                enableConsoleMode: this.enableConsoleMode.bind(this),
                disableConsoleMode: this.disableConsoleMode.bind(this),
                console: this.consoleRef.current!,
                returnToIndex: async () => {
                    setTimeout(() => {
                        this.props.onLogout();
                    }, 250);
                    // give time for the reload to take place
                    await new Promise((_) => {});
                },
                raiseAlert: this.raiseAlert.bind(this),
                raiseConfirmDelete: this.raiseConfirmDelete.bind(this),
            }),
            settings,
            {
                session: sessionStorage,
                userDBConn: new JsStore.Connection(Db.getWorker()),
                userDBConstructor: (conn, name) => new Id.Database(conn, name),
                postDBConn: new JsStore.Connection(Db.getWorker()),
                postDBConstructor: (conn, name) =>
                    new Post.Database(conn, name),
                verifiedPostDBConstructor: (db) => new Post.PostDB(db),
                unverifiedPostDBConstructor: (db) =>
                    new Post.UnverifiedPostDB(db),
            }
        );
    }

    render() {
        const confirmDeleteParams = this.state.confirmDeleteParams;
        const alertParams = this.state.alertParams;
        return (
            <>
                <div
                    id="page"
                    style={{ display: this.state.consoleMode ? "none" : "" }}
                >
                    <PostEditor postCB={this.addPost.bind(this)} parent={""} />
                    <br />
                    %Search <input ref={this.searchRef} onChange={() => {
                        const tag = this.searchRef.current!.value;
                        this.setFilter!(tag || "");
                    }}/>
                    <hr />
                    <div id="content">
                        <PostList
                            posts={[]}
                            postCB={this.addPost.bind(this)}
                            editCB={this.editPost.bind(this)}
                            getAddPosts={this.getAddPost.bind(this)}
                            getSetFilter={this.getSetFilter.bind(this)}
                        />
                    </div>
                </div>
                <div
                    id="console"
                    style={{ display: this.state.consoleMode ? "" : "none" }}
                    ref={this.consoleRef}
                />

                {confirmDeleteParams && (
                    <ConfirmDeletion
                        onCancel={() => {
                            confirmDeleteParams.callback(true);
                            this.clearConfirmDelete();
                        }}
                        onOK={() => {
                            confirmDeleteParams.callback(false);
                            this.clearConfirmDelete();
                        }}
                        expectedName={confirmDeleteParams.name}
                    />
                )}

                {alertParams && (
                    <Alert
                        onOK={() => {
                            alertParams.callback();
                            this.clearAlert();
                        }}
                        contents={alertParams.contents}
                    />
                )}
            </>
        );
    }
}
