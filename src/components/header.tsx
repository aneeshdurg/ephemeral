import * as React from "react";

export default class Header extends React.Component<{}, {}> {
    render() {
        return (
            <div className="header">
                <h1>
                    ephemeral
                    <img src="./assets/logo.png" className="icon" />
                </h1>
                <hr />
            </div>
        );
    }
}
