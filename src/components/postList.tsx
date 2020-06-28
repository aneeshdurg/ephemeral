import * as React from "react";

import { AddPostCB } from "../ephemeralMain";
import { Post as PostObject } from "../objects";
import Post, { PostEntry, ReplyCB } from "./post";
import { PostCB } from "./postEditor";

export interface PostListProps {
    posts: Array<PostEntry>;
    postCB: PostCB;
    getAddPosts: (addPost: AddPostCB) => void;
}

export interface PostListState {
    posts: Array<PostEntry>;
}

export default class PostList extends React.Component<
    PostListProps,
    PostListState
> {
    postReplyCBs: Map<string, ReplyCB> = new Map();
    rendered: Set<string> = new Set();

    constructor(props: PostListProps) {
        super(props);
        this.state = { posts: props.posts };
    }

    registerReplyCB(postid: string, cb: ReplyCB) {
        this.postReplyCBs.set(postid, cb);
    }

    addPost(post: PostObject, editable: boolean): boolean {
        if (this.rendered.has(post.id)) return true;

        if (post.parent) {
            if (!this.postReplyCBs.has(post.parent)) return false;
            this.postReplyCBs.get(post.parent)!(post, editable);
            this.rendered.add(post.id);
            return true;
        } else {
            this.state.posts.unshift({post: post, editable: editable});
            this.setState({ posts: this.state.posts });
            this.rendered.add(post.id);
            return true;
        }
    }

    render() {
        this.props.getAddPosts(this.addPost.bind(this));
        const posts = [];
        for (const entry of this.state.posts) {
            const getReplyCB = this.registerReplyCB.bind(this, entry.post.id);
            posts.push(
                <Post
                    key={entry.post.id}
                    editable={entry.editable}
                    post={entry.post}
                    postCB={this.props.postCB}
                    getAddReply={getReplyCB}
                />
            );
        }

        return <div id="posts">{posts}</div>;
    }
}
