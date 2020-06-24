import * as React from "react";

import { Post as PostObject } from "../objects";
import Post, { ReplyCB } from "./post";

export type AddPostCB = (p: PostObject) => boolean;

export interface PostListProps {
    posts: Array<PostObject>;
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

    constructor(props: PostListProps) {
        super(props);
        this.state = { posts: props.posts };
        this.props.getAddPosts(this.addPost.bind(this));
    }

    registerReplyCB(postid: string, cb: ReplyCB) {
        this.postReplyCBs.set(postid, cb);
    }

    addPost(post: PostObject): boolean {
        if (post.parent) {
            if (!this.postReplyCBs.has(post.parent)) return false;
            this.postReplyCBs.get(post.parent)!(post);
            return true;
        } else {
            console.log("Adding post", post);
            this.state.posts.unshift(post);
            this.setState({ posts: this.state.posts });
            return true;
        }
    }

    render() {
        console.log("Rendering PostList");
        const posts = [];
        for (const post of this.state.posts) {
            const getReplyCB = this.registerReplyCB.bind(this, post.id);
            posts.push(<Post post={post} getAddReply={getReplyCB} />);
        }

        return <div id="posts">{posts}</div>;
    }
}
