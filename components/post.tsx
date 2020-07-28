import showdown from "showdown";
import * as React from "react";

import { Post as PostObject } from "../post";
import Author from "./author";
import PostEditor, { PostCB } from "./postEditor";

export type EditCB = (newContents: string, post: PostObject) => Promise<void>;
export type ReplyCB = (reply: PostObject, editable: boolean) => void;
export type UpdateCB = (newPost: PostObject) => void;

export interface PostProps {
    key: string;
    editable: boolean;
    post: PostObject;
    postCB: PostCB;
    editCB: EditCB;
    getAddReply: (rcb: ReplyCB) => void;
    getUpdate: (ucb: UpdateCB) => void;
}

export interface PostEntry {
    post: PostObject;
    editable: boolean;
}

export interface PostState {
    post: PostObject;
    replies: Array<PostEntry>;
    renderEdit: boolean;
    renderReply: boolean;
}

export default class Post extends React.Component<PostProps, PostState> {
    constructor(props: PostProps) {
        super(props);
        this.state = {
            post: this.props.post,
            replies: [],
            renderReply: false,
            renderEdit: false,
        };
    }

    addReply(reply: PostObject, editable: boolean) {
        // TODO sort replies by timestamp?
        this.setState((state) => {
            const replies = [...state.replies];
            replies.push({ post: reply, editable: editable });
            return { ...state, replies: replies };
        });
    }

    update(post: PostObject) {
        this.setState((state) => {
            return { ...state, post: post };
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

    async onEdit(newContents: string, _parent: string | null) {
        await this.props.editCB(newContents, this.state.post);
    }

    generateHTMLfromMarkdown() {
        const converter = new showdown.Converter();
        const contents = converter.makeHtml(this.state.post.contents);
        return contents;
    }

    getTimestamp() {
        const date = new Date(this.state.post.timestamp);
        return date.toLocaleString("default", {
            month: "short",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        });
    }

    render() {
        this.props.getAddReply(this.addReply.bind(this));
        this.props.getUpdate(this.update.bind(this));
        const replies = [];
        // TODO allow updateable replies
        for (const reply of this.state.replies) {
            replies.push(
                <Post
                    key={reply.post.id}
                    editable={reply.editable}
                    post={reply.post}
                    postCB={this.props.postCB}
                    editCB={this.props.editCB}
                    getAddReply={(_: ReplyCB) => {}}
                    getUpdate={(_: UpdateCB) => {}}
                />
            );
        }
        return (
            <div className="post" id={this.state.post.id}>
                <Author ident={this.state.post.author} />
                {!this.state.renderEdit && this.props.editable && (
                    <a
                        className="btn edit-btn"
                        onClick={this.enableEdit.bind(this)}
                    >
                        Edit
                    </a>
                )}

                {this.state.renderEdit && (
                    <>
                        <PostEditor
                            parent={this.state.post.parent}
                            postCB={this.onEdit.bind(this)}
                            onFinish={this.disableEdit.bind(this)}
                            cancellable={true}
                            initialContents={this.state.post.contents}
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

                {!this.state.post.parent && (
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
                        parent={this.state.post.id}
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
