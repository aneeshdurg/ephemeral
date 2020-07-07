import localforage from "localforage";
import * as React from "react";
import * as ReactDOM from "react-dom";

import Header from "./components/header";
import PostEditor from "./components/postEditor";
import PostList from "./components/postList";
import ConfirmDeletion from "./components/confirmDeletion";
import { ConnectionsUpdaterCB, IdentUpdaterCB } from "./components/connections";

import * as settings from "./settings.json";
import { Client } from "./client";
import { UIElements, AddPostCB } from "./ui";

interface ConfirmDeleteParams {
    name: string;
    callback: (cancelled: boolean) => void;
}

interface EphemeralState {
    consoleMode: boolean;
    confirmDeleteParams: ConfirmDeleteParams | null;
}

class Ephemeral extends React.Component<{}, EphemeralState> {
    renderPost: AddPostCB | null = null;
    updateConns: ConnectionsUpdaterCB | null = null;
    updateIdent: IdentUpdaterCB | null = null;
    client: Client | null = null;
    consoleRef: React.RefObject<HTMLDivElement> = React.createRef();

    constructor(props: {}) {
        super(props);
        this.state = {
            consoleMode: false,
            confirmDeleteParams: null,
        };
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
            return { ...state, confirmDeleteParams: {
                name: name,
                callback: callback
            }};
        });
    }

    clearConfirmDelete() {
        this.setState((state) => {
            return { ...state, confirmDeleteParams: null };
        });
    }

    getAddPost(addPost: AddPostCB) {
        this.renderPost = addPost;
    }

    getConnsUpdater(updateConns: ConnectionsUpdaterCB) {
        this.updateConns = updateConns;
    }

    getIdentUpdater(updateIdent: IdentUpdaterCB) {
        this.updateIdent = updateIdent;
    }

    async addPost(contents: string, parent: string | null) {
        const post = await this.client!.postCB(contents, parent);
        this.renderPost!(post, true);
    }

    componentDidMount() {
        this.client = new Client(
            new UIElements({
                renderPost: this.renderPost!,
                updateConns: this.updateConns!,
                updateIdent: this.updateIdent!,
                enableConsoleMode: this.enableConsoleMode.bind(this),
                disableConsoleMode: this.disableConsoleMode.bind(this),
                console: this.consoleRef.current!,
                returnToIndex: async () => {
                    setTimeout(() => {
                        window.location.href = "./index.html";
                    }, 1000);
                    // give time for the reload to take place
                    await new Promise((r) => setTimeout(r, 2 * 1000));
                },
                raiseConfirmDelete: this.raiseConfirmDelete.bind(this),
            }),
            settings,
            {
                session: sessionStorage,
                database: localforage,
            }
        );
    }

    render() {
        const confirmDeleteParams = this.state.confirmDeleteParams;
        return (
            <>
                <div
                    id="page"
                    style={{ display: this.state.consoleMode ? "none" : "" }}
                >
                    <Header
                        renderLogout={true}
                        getConnsUpdater={this.getConnsUpdater.bind(this)}
                        getIdentUpdater={this.getIdentUpdater.bind(this)}
                    />
                    <PostEditor postCB={this.addPost.bind(this)} parent={""} />
                    <hr />
                    <div id="content">
                        <PostList
                            posts={[]}
                            postCB={this.addPost.bind(this)}
                            getAddPosts={this.getAddPost.bind(this)}
                        />
                    </div>
                </div>
                <div
                    id="console"
                    style={{ display: this.state.consoleMode ? "" : "none" }}
                    ref={this.consoleRef}
                />

                { confirmDeleteParams &&
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
                }
            </>
        );
    }
}

document.addEventListener("DOMContentLoaded", () => {
    ReactDOM.render(<Ephemeral />, document.body);
});
