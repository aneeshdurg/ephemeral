import showdown from "showdown";
import * as React from "react";

export type PostCB = (contents: string, parent: string | null) => Promise<void>;
export interface PostEditorProps {
    postCB: PostCB;
    onFinish?: () => void;
    cancellable?: boolean;
}

export default class PostEditor extends React.Component<PostEditorProps, {}> {
    containerRef: React.RefObject<HTMLDivElement> = React.createRef();

    componentDidMount() {
        // set focus to be the input
        const parentEl = this.containerRef.current!;
        const postInput = parentEl.querySelector(
            "#post-input"
        ) as HTMLInputElement;
        const props = this.props;
        async function doPost() {
            if (postInput.value != "") {
                const converter = new showdown.Converter();
                const contents = converter.makeHtml(postInput.value);
                await props.postCB(contents, parentEl.dataset.parent || "");
                postInput.value = "";

                if (props.onFinish) props.onFinish();
            }
        }

        postInput.addEventListener("keyup", async (e) => {
            if (!e.shiftKey && e.key == "Enter") doPost();
        });

        const postSubmit = parentEl.querySelector("#post-submit")!;
        postSubmit.addEventListener("click", doPost);
    }

    render() {
        return (
            <div className="new-post" id="new-post" ref={this.containerRef}>
                <textarea
                    id="post-input"
                    placeholder="Type a new post!"
                ></textarea>
                <button id="post-submit">Post</button>
            </div>
        );
    }
}
