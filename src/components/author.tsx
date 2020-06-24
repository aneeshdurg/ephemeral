import * as React from "react";

import { idToColor } from "../ui";
import { Identity } from "../objects";

export interface AuthorProps {
    ident: Identity;
}

export interface AuthorState {
    expanded: boolean;
}

export default class Author extends React.Component<AuthorProps, AuthorState> {
    constructor(props: AuthorProps) {
        super(props);
        this.state = { expanded: false };
    }

    toggleExpand() {
        this.setState({ expanded: !this.state.expanded });
    }

    render() {
        const ident = this.props.ident;
        return (
            <div
                className="post-author"
                title={`{ident.name}@{ident.id}`}
                style={{ color: idToColor(ident.id) }}
                onClick={this.toggleExpand.bind(this)}
            >
                <b>{ident.name}</b>
                {this.state.expanded && <>@{ident.id}</>}
                <>:</>
            </div>
        );
    }
}
