import * as React from "react";

import Connections from "./connections";

export interface HeaderProps {
    renderLogout: boolean;
}

export default class Header extends React.Component<HeaderProps, {}> {
    render() {
        return (
            <div className="header">
                <h1>
                    ephemeral
                    <img src="./assets/logo.png" className="icon" />
                </h1>
                <Connections />
                {this.props.renderLogout && (
                    <a href="./index.html" style={{ float: "right" }}>
                        Logout
                    </a>
                )}
                <hr />
            </div>
        );
    }
}
