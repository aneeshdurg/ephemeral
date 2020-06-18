import * as React from "react";
export declare type PostCB = (contents: string, parent: string | null) => Promise<void>;
export interface PostEditorProps {
    parent: string;
    postCB: PostCB;
    onFinish?: () => void;
    cancellable?: boolean;
    initialContents?: string;
}
export default class PostEditor extends React.Component<PostEditorProps, {}> {
    inputRef: React.RefObject<HTMLTextAreaElement>;
    constructor(props: PostEditorProps);
    doPost(): Promise<void>;
    render(): JSX.Element;
}
