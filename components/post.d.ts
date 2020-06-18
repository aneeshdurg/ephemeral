import * as React from "react";
import { Post as PostObject } from "../post";
import { PostCB } from "./postEditor";
export declare type ReplyCB = (reply: PostObject, editable: boolean) => void;
export interface PostProps {
    key: string;
    editable: boolean;
    post: PostObject;
    postCB: PostCB;
    getAddReply: (rcb: ReplyCB) => void;
}
export interface PostEntry {
    post: PostObject;
    editable: boolean;
}
export interface PostState {
    replies: Array<PostEntry>;
    renderEdit: boolean;
    renderReply: boolean;
}
export default class Post extends React.Component<PostProps, PostState> {
    constructor(props: PostProps);
    addReply(reply: PostObject, editable: boolean): void;
    enableReply(): void;
    disableReply(): void;
    enableEdit(): void;
    disableEdit(): void;
    onEdit(_contents: string, _parent: string | null): Promise<void>;
    generateHTMLfromMarkdown(): string;
    getTimestamp(): string;
    render(): JSX.Element;
}
