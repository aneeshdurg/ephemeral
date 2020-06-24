import * as React from "react";

import { Post as PostObject } from "../objects";
import Author from "./author";
import PostEditor, { PostCB } from "./postEditor";

export type ReplyCB = (reply: PostObject) => void;

export interface PostProps {
    key: string;
    post: PostObject;
    postCB: PostCB;
    getAddReply: (rcb: ReplyCB) => void;
}

export interface PostState {
    replies: Array<PostObject>;
    renderReply: boolean;
}

export default class Post extends React.Component<PostProps, PostState> {
    constructor(props: PostProps) {
        super(props);
        this.state = { replies: [], renderReply: false };
    }

    addReply(reply: PostObject) {
        // TODO sort replies by timestamp?
        this.setState((state) => {
            const replies = [...state.replies];
            replies.push(reply);
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

    render() {
        this.props.getAddReply(this.addReply.bind(this));
        const replies = [];
        for (const reply of this.state.replies) {
            replies.push(
                <Post
                    key={reply.id}
                    post={reply}
                    postCB={this.props.postCB}
                    getAddReply={(_: ReplyCB) => {}}
                />
            );
        }
        return (
            <div className="post" id={this.props.post.id}>
                <Author ident={this.props.post.author} />
                <div className="post-contents">
                    <div
                        className="post-contents-inner"
                        dangerouslySetInnerHTML={{
                            __html: this.props.post.contents,
                        }}
                    />
                </div>
                {!this.props.post.parent && (
                    <>
                        <button onClick={this.enableReply.bind(this)}>
                            Reply
                        </button>
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
