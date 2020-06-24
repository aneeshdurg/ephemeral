import * as React from "react";

import { Post as PostObject } from "../objects";
import Post, { ReplyCB } from "./post";
import { PostCB } from "./postEditor";

export type AddPostCB = (p: PostObject) => boolean;

export interface PostListProps {
    posts: Array<PostObject>;
    postCB: PostCB;
    getAddPosts: (addPost: AddPostCB) => void;
}
export interface PostListState {
    posts: Array<PostObject>;
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

    addPost(post: PostObject): boolean {
        if (this.rendered.has(post.id)) return true;

        if (post.parent) {
            if (!this.postReplyCBs.has(post.parent)) return false;
            this.postReplyCBs.get(post.parent)!(post);
            this.rendered.add(post.id);
            return true;
        } else {
            this.state.posts.unshift(post);
            this.setState({ posts: this.state.posts });
            this.rendered.add(post.id);
            return true;
        }
    }

    render() {
        this.props.getAddPosts(this.addPost.bind(this));
        const posts = [];
        for (const post of this.state.posts) {
            const getReplyCB = this.registerReplyCB.bind(this, post.id);
            posts.push(
                <Post
                    key={post.id}
                    post={post}
                    postCB={this.props.postCB}
                    getAddReply={getReplyCB}
                />
            );
        }

        return <div id="posts">{posts}</div>;
    }
}
