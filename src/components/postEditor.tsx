import showdown from "showdown";
import * as React from "react";

export type PostCB = (contents: string, parent: string | null) => Promise<void>;
export interface PostEditorProps {
    parent: string;
    postCB: PostCB;
    onFinish?: () => void;
    cancellable?: boolean;
}

export default class PostEditor extends React.Component<PostEditorProps, {}> {
    inputRef: React.RefObject<HTMLTextAreaElement> = React.createRef();

    constructor(props: PostEditorProps) {
        super(props);
        this.doPost = this.doPost.bind(this);
    }

    async doPost() {
        const input = this.inputRef.current!;
        if (input.value != "") {
            const converter = new showdown.Converter();
            const contents = converter.makeHtml(input.value);
            await this.props.postCB(contents, this.props.parent);
            input.value = "";

            if (this.props.onFinish) this.props.onFinish();
        }
    }

    render() {
        const that = this;
        return (
            <div className="new-post" id="new-post">
                <textarea
                    id="post-input"
                    placeholder="Type a new post!"
                    ref={this.inputRef}
                    onKeyUp={(e: any) => {
                        if (!e.shiftKey && e.key == "Enter") that.doPost();
                    }}
                ></textarea>
                <button id="post-submit" onClick={this.doPost}>
                    Post
                </button>
                {this.props.cancellable && (
                    <button onClick={this.props.onFinish}>Cancel</button>
                )}
            </div>
        );
    }
}
