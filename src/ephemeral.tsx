import * as React from "react";
import * as ReactDOM from "react-dom";

import Header from "./components/header";
import Connections from "./components/connections";
import PostEditor from "./components/postEditor";

import { main, postCB } from "./ephemeralMain";

// import Post from "./components/post";
// import {Identity} from "./objects";
// const ident = new Identity();
// ident.initialize("hi", "randomID123");
// <Post
//     id="1234"
//     author={{ident: ident}}
//     contents="hello world!"
// />

const editorProps = {
    postCB: postCB,
};

class Ephemeral extends React.Component<{}, {}> {
    componentDidMount() {
        main();
    }

    render() {
        return (
            <>
                <Header>
                    <Connections />
                </Header>
                <PostEditor {...editorProps} />
            </>
        );
    }
}

document.addEventListener("DOMContentLoaded", () => {
    ReactDOM.render(<Ephemeral />, document.getElementById("page"));
});
