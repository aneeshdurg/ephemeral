import * as React from "react";
import { Post as PostObject } from "../post";
import { PostEntry, ReplyCB } from "./post";
import { PostCB } from "./postEditor";
import { AddPostCB } from "../ui";
export interface PostListProps {
    posts: Array<PostEntry>;
    postCB: PostCB;
    getAddPosts: (addPost: AddPostCB) => void;
}
export interface PostListState {
    posts: Array<PostEntry>;
}
export default class PostList extends React.Component<PostListProps, PostListState> {
    postReplyCBs: Map<string, ReplyCB>;
    rendered: Set<string>;
    constructor(props: PostListProps);
    registerReplyCB(postid: string, cb: ReplyCB): void;
    addPost(post: PostObject, editable: boolean): boolean;
    render(): JSX.Element;
}
