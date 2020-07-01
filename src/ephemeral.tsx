import * as React from "react";
import * as ReactDOM from "react-dom";

import Header from "./components/header";
import PostEditor from "./components/postEditor";
import PostList from "./components/postList";
import "./debug";

import { main, postCB, AddPostCB } from "./ephemeralMain";

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
        const post = await postCB(contents, parent);
        this._addPost!(post, true);
    }

    componentDidMount() {
        main(this._addPost!);
    }

    render() {
        return (
            <>
                <Header renderLogout={true} />
                <PostEditor postCB={this.addPost.bind(this)} parent={""} />
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
