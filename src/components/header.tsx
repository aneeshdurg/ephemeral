import * as React from "react";

import Connections, {
    ConnectionsUpdaterCB,
    IdentUpdaterCB,
} from "./connections";

export interface HeaderProps {
    renderLogout: boolean;
    getConnsUpdater?: (updater: ConnectionsUpdaterCB) => void;
    getIdentUpdater?: (updater: IdentUpdaterCB) => void;
}

const defaultGetUpdater = (_: any) => {};

export default class Header extends React.Component<HeaderProps, {}> {
    render() {
        const connsUpdater = this.props.getConnsUpdater || defaultGetUpdater;
        const identUpdater = this.props.getIdentUpdater || defaultGetUpdater;
        return (
            <div className="header">
                <h1 className="title">
                    ephemeral
                    <img src="./assets/logo.png" className="icon" />
                </h1>
                <Connections
                    getConnsUpdater={connsUpdater}
                    getIdentUpdater={identUpdater}
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
