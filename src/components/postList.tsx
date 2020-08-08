import * as React from "react";

import { Post as PostObject } from "../post";
import Post, { EditCB, PostEntry, ReplyCB, UpdateCB } from "./post";
import { PostCB } from "./postEditor";
import { AddPostCB } from "../ui";

export type FilterCB = (filterTag: string) => void;

export interface PostListProps {
    posts: Array<PostEntry>;
    postCB: PostCB;
    editCB: EditCB;
    getAddPosts: (addPost: AddPostCB) => void;
    getSetFilter: (setFilter: FilterCB) => void;
}

export interface PostListState {
    posts: Array<PostEntry>;
    filter: string;
}

export default class PostList extends React.Component<
    PostListProps,
    PostListState
> {
    postReplyCBs: Map<string, ReplyCB> = new Map();
    postUpdateCBs: Map<string, UpdateCB> = new Map();
    rendered: Set<string> = new Set();

    constructor(props: PostListProps) {
        super(props);
        this.state = { posts: props.posts, filter: "" };
    }

    registerReplyCB(postid: string, cb: ReplyCB) {
        this.postReplyCBs.set(postid, cb);
    }

    registerUpdateCB(postid: string, cb: UpdateCB) {
        this.postUpdateCBs.set(postid, cb);
    }

    setFilter(tag: string) {
        this.setState((state) => {
            return { ...state, filter: tag };
        });
    }

    updatePost(post: PostObject) {
        this.setState((state) => {
            const idx = state.posts.findIndex(
                (p) => p.post.desc.id === post.desc.id
            );
            if (idx > 0) {
                const editable = state.posts[idx].editable;
                state.posts[idx] = { post: post, editable: editable };
            }

            return state;
        });
    }

    addPost(post: PostObject, editable: boolean, update: boolean): boolean {
        if (this.rendered.has(post.desc.id)) {
            if (update) {
                const updateCB = this.postUpdateCBs.get(post.desc.id);
                if (updateCB) updateCB(post);
                // Need to add this post into our state so that we have the
                // updated post on a re-render.
                this.updatePost(post);
            }

            return true;
        }

        if (post.parent) {
            if (!this.postReplyCBs.has(post.parent)) return false;
            this.postReplyCBs.get(post.parent)!(post, editable);
            this.rendered.add(post.desc.id);
            return true;
        } else {
            this.state.posts.unshift({ post: post, editable: editable });
            this.setState({ posts: this.state.posts });
            this.rendered.add(post.desc.id);
            return true;
        }
    }

    render() {
        this.props.getAddPosts(this.addPost.bind(this));
        this.props.getSetFilter(this.setFilter.bind(this));
        const posts = [];
        for (const entry of this.state.posts) {
            const shouldRenderPost =
                this.state.filter === "" ||
                entry.post.tags.find((tag) => tag === this.state.filter);
            if (!shouldRenderPost) continue;
            const getReplyCB = this.registerReplyCB.bind(
                this,
                entry.post.desc.id
            );
            const getUpdateCB = this.registerUpdateCB.bind(
                this,
                entry.post.desc.id
            );
            posts.push(
                <Post
                    key={entry.post.desc.id}
                    editable={entry.editable}
                    post={entry.post}
                    postCB={this.props.postCB}
                    editCB={this.props.editCB}
                    getAddReply={getReplyCB}
                    getUpdate={getUpdateCB}
                />
            );
        }

        return <div id="posts">{posts}</div>;
    }
}
