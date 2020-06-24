import * as React from "react";
import * as ReactDOM from "react-dom";

import Connections from "./components/connections";
import Header from "./components/header";
import PostEditor from "./components/postEditor";
import PostList, { AddPostCB } from "./components/postList";

import { main, postCB } from "./ephemeralMain";

// import {Post} from "./objects";
// import Post from "./components/post";
// import {Identity} from "./objects";
// const ident = new Identity();
// ident.initialize("hi", "randomID123");
// const post = new Post(ident, "hello!");
// <Post post={post} />

class Ephemeral extends React.Component<{}, {}> {
    _addPost: AddPostCB | null = null;

    getAddPost(addPost: AddPostCB) {
        this._addPost = addPost;
    }

    async addPost(contents: string, parent: string | null) {
        console.log("hi");
        const post = await postCB(contents, parent);
        this._addPost!(post);
    }

    componentDidMount() {
        main(this._addPost!);
    }

    render() {
        return (
            <>
                <Header>
                    <Connections />
                </Header>
                <PostEditor postCB={this.addPost.bind(this)} />
                <div id="content">
                    <PostList
                        posts={[]}
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
