import * as React from "react";
import { Post as PostObject } from "../post";
import { EditCB, PostEntry, ReplyCB, UpdateCB } from "./post";
import { PostCB } from "./postEditor";
import { AddPostCB } from "../ui";
export interface PostListProps {
    posts: Array<PostEntry>;
    postCB: PostCB;
    editCB: EditCB;
    getAddPosts: (addPost: AddPostCB) => void;
}
export interface PostListState {
    posts: Array<PostEntry>;
}
export default class PostList extends React.Component<PostListProps, PostListState> {
    postReplyCBs: Map<string, ReplyCB>;
    postUpdateCBs: Map<string, UpdateCB>;
    rendered: Set<string>;
    constructor(props: PostListProps);
    registerReplyCB(postid: string, cb: ReplyCB): void;
    registerUpdateCB(postid: string, cb: UpdateCB): void;
    addPost(post: PostObject, editable: boolean, update?: boolean): boolean;
    render(): JSX.Element;
}
