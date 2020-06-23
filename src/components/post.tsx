import * as React from "react";

import Author, { AuthorProps } from "./author";

export interface PostProps {
    id: string;
    author: AuthorProps;
    contents: string;
}

export default class Post extends React.Component<PostProps, {}> {
    render() {
        return (
            <div className="post" id={this.props.id}>
                <Author {...this.props.author} />
                <div
                    className="post-contents"
                    dangerouslySetInnerHTML={{ __html: this.props.contents }}
                ></div>
            </div>
        );
    }
}
