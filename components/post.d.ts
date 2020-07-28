import * as React from "react";
import { Post as PostObject } from "../post";
import { PostCB } from "./postEditor";
export declare type EditCB = (newContents: string, post: PostObject) => Promise<void>;
export declare type ReplyCB = (reply: PostObject, editable: boolean) => void;
export declare type UpdateCB = (newPost: PostObject) => void;
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
    constructor(props: PostProps);
    addReply(reply: PostObject, editable: boolean): void;
    update(post: PostObject): void;
    enableReply(): void;
    disableReply(): void;
    enableEdit(): void;
    disableEdit(): void;
    onEdit(newContents: string, _parent: string | null): Promise<void>;
    generateHTMLfromMarkdown(): string;
    getTimestamp(): string;
    render(): JSX.Element;
}
