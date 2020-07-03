import * as React from "react";

import Connections, { ConnectionUpdaterCB } from "./connections";

export interface HeaderProps {
    renderLogout: boolean;
    getIdentUpdater?: (updater: ConnectionUpdaterCB) => void;
}

const defaultGetUpdater = (_: ConnectionUpdaterCB) => {};

export default class Header extends React.Component<HeaderProps, {}> {
    render() {
        return (
            <div className="header">
                <h1 className="title">
                    ephemeral
                    <img src="./assets/logo.png" className="icon" />
                </h1>
                <Connections
                    getUpdater={this.props.getIdentUpdater || defaultGetUpdater}
                />
                {this.props.renderLogout && (
                    <>
                        <a
                            className="btn"
                            href="./index.html"
                            style={{ float: "right" }}
                        >
                            Logout
                        </a>
                        <br />
                        <br />
                    </>
                )}
                <hr />
            </div>
        );
    }
}
