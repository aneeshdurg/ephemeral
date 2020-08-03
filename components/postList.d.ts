import * as React from "react";
import { Post as PostObject } from "../post";
import { EditCB, PostEntry, ReplyCB, UpdateCB } from "./post";
import { PostCB } from "./postEditor";
import { AddPostCB } from "../ui";
export declare type FilterCB = (filterTag: string) => void;
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
export default class PostList extends React.Component<PostListProps, PostListState> {
    postReplyCBs: Map<string, ReplyCB>;
    postUpdateCBs: Map<string, UpdateCB>;
    rendered: Set<string>;
    constructor(props: PostListProps);
    registerReplyCB(postid: string, cb: ReplyCB): void;
    registerUpdateCB(postid: string, cb: UpdateCB): void;
    setFilter(tag: string): void;
    updatePost(post: PostObject): void;
    addPost(post: PostObject, editable: boolean, update: boolean): boolean;
    render(): JSX.Element;
}
