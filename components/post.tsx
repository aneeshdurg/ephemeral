import showdown from "showdown";
import * as React from "react";

import { Post as PostObject } from "../post";
import Author from "./author";
import PostEditor, { PostCB } from "./postEditor";

export type ReplyCB = (reply: PostObject, editable: boolean) => void;

export interface PostProps {
    key: string;
    editable: boolean;
    post: PostObject;
    postCB: PostCB;
    getAddReply: (rcb: ReplyCB) => void;
}

export interface PostEntry {
    post: PostObject;
    editable: boolean;
}

export interface PostState {
    replies: Array<PostEntry>;
    renderEdit: boolean;
    renderReply: boolean;
}

export default class Post extends React.Component<PostProps, PostState> {
    constructor(props: PostProps) {
        super(props);
        this.state = { replies: [], renderReply: false, renderEdit: false };
    }

    addReply(reply: PostObject, editable: boolean) {
        // TODO sort replies by timestamp?
        this.setState((state) => {
            const replies = [...state.replies];
            replies.push({ post: reply, editable: editable });
            return { ...state, replies: replies };
        });
    }

    enableReply() {
        this.setState((state) => {
            return { ...state, renderReply: true };
        });
    }

    disableReply() {
        this.setState((state) => {
            return { ...state, renderReply: false };
        });
    }

    enableEdit() {
        this.setState((state) => {
            return { ...state, renderEdit: true };
        });
    }

    disableEdit() {
        this.setState((state) => {
            return { ...state, renderEdit: false };
        });
    }

    async onEdit(_contents: string, _parent: string | null) {
        // do nothing
    }

    generateHTMLfromMarkdown() {
        const converter = new showdown.Converter();
        const contents = converter.makeHtml(this.props.post.contents);
        return contents;
    }

    getTimestamp() {
        const date = new Date(this.props.post.timestamp);
        return date.toLocaleString("default", {
            month: "short",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        });
    }

    render() {
        this.props.getAddReply(this.addReply.bind(this));
        const replies = [];
        for (const reply of this.state.replies) {
            replies.push(
                <Post
                    key={reply.post.id}
                    editable={reply.editable}
                    post={reply.post}
                    postCB={this.props.postCB}
                    getAddReply={(_: ReplyCB) => {}}
                />
            );
        }
        return (
            <div className="post" id={this.props.post.id}>
                <Author ident={this.props.post.author} />
                {this.state.renderEdit && (
                    <>
                        <PostEditor
                            parent={this.props.post.parent}
                            postCB={this.onEdit.bind(this)}
                            onFinish={this.disableEdit.bind(this)}
                            cancellable={true}
                            initialContents={this.props.post.contents}
                        />
                        <br />
                    </>
                )}
                {!this.state.renderEdit && (
                    <div className="post-contents">
                        <div
                            className="post-contents-inner"
                            dangerouslySetInnerHTML={{
                                __html: this.generateHTMLfromMarkdown(),
                            }}
                        />
                    </div>
                )}
                <div className="timestamp">Posted {this.getTimestamp()}</div>

                {!this.state.renderEdit && this.props.editable && (
                    <a className="btn" onClick={this.enableEdit.bind(this)}>
                        Edit
                    </a>
                )}

                {!this.props.post.parent && (
                    <>
                        <a
                            className="btn"
                            onClick={this.enableReply.bind(this)}
                        >
                            Reply
                        </a>
                        <br />
                    </>
                )}
                {this.state.renderReply && (
                    <PostEditor
                        parent={this.props.post.id}
                        postCB={this.props.postCB}
                        onFinish={this.disableReply.bind(this)}
                        cancellable={true}
                    />
                )}
                {replies}
            </div>
        );
    }
}
