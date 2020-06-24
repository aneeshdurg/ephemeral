import * as React from "react";

import { Post as PostObject } from "../objects";
import Author from "./author";

export type ReplyCB = (reply: PostObject) => void;

export interface PostProps {
    post: PostObject;
    getAddReply: (rcb: ReplyCB) => void;
}

export interface PostState {
    replies: Array<PostObject>;
}

export default class Post extends React.Component<PostProps, PostState> {
    constructor(props: PostProps) {
        super(props);
        this.state = { replies: [] };
        this.props.getAddReply(this.addReply.bind(this));
    }

    addReply(reply: PostObject) {
        // TODO sort replies by timestamp?
        this.state.replies.push(reply);
        this.setState({ replies: this.state.replies });
    }

    render() {
        const replies = [];
        for (const reply of this.state.replies) {
            replies.push(
                <Post post={reply} getAddReply={(_: ReplyCB) => {}} />
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
                    {replies}
                </div>
            </div>
        );
    }
}
