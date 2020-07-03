import * as React from "react";
import * as ReactDOM from "react-dom";

import Header from "./components/header";
import PostEditor from "./components/postEditor";
import PostList from "./components/postList";
import { ConnectionUpdaterCB } from "./components/connections";
import "./debug";

import * as settings from "./settings.json";
import { Client, AddPostCB } from "./client";
import { UIElements } from "./ui";

class Ephemeral extends React.Component<{}, {}> {
    _addPost: AddPostCB | null = null;
    updateIdent: ConnectionUpdaterCB | null = null;
    client: Client | null = null;

    getAddPost(addPost: AddPostCB) {
        this._addPost = addPost;
    }

    getIdentUpdater(updateIdent: ConnectionUpdaterCB) {
        this.updateIdent = updateIdent;
    }

    async addPost(contents: string, parent: string | null) {
        const post = await this.client!.postCB(contents, parent);
        this._addPost!(post, true);
    }

    componentDidMount() {
        this.client = new Client(
            this._addPost!,
            new UIElements(this.updateIdent!),
            settings
        );
    }

    render() {
        return (
            <>
                <Header
                    renderLogout={true}
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
            </>
        );
    }
}

document.addEventListener("DOMContentLoaded", () => {
    ReactDOM.render(<Ephemeral />, document.getElementById("page"));
});
