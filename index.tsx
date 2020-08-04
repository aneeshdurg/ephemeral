import * as React from "react";
import * as ReactDOM from "react-dom";

import Header from "./components/header";
import Login from "./components/login";
import Ephemeral from "./components/ephemeral";
import * as Connections from "./components/connections";

enum PageRenderState {
    Login,
    Ephemeral,
}

interface PageState {
    state: PageRenderState;
}

class Page extends React.Component<{}, PageState> {
    updateConns: Connections.ConnectionsUpdaterCB | null = null;
    updateIdent: Connections.IdentUpdaterCB | null = null;
    headerClear: (() => void) | null = null;

    constructor(props: {}) {
        super(props);

        const params = new URLSearchParams(window.location.search);
        this.state = {
            state:
                params.get("page") === "ephemeral"
                    ? PageRenderState.Ephemeral
                    : PageRenderState.Login,
        };
    }

    getConnsUpdater(updateConns: Connections.ConnectionsUpdaterCB) {
        this.updateConns = updateConns;
    }

    getIdentUpdater(updateIdent: Connections.IdentUpdaterCB) {
        this.updateIdent = updateIdent;
    }

    getHeaderClear(clear: () => void) {
        this.headerClear = clear;
    }

    onLogin() {
        this.setState({ state: PageRenderState.Ephemeral });
        history.pushState({}, "Ephemeral", window.location + "?page=ephemeral");
    }

    ephemeralDestructor: () => void = () => {};
    getDestroy(destructor: () => void) {
        this.ephemeralDestructor = destructor;
    }

    onLogout() {
        this.headerClear!();
        this.setState({ state: PageRenderState.Login });
        this.ephemeralDestructor();
        history.pushState({}, "Login", new URL(window.location + "").pathname);
    }

    loginIsActive(): boolean {
        return this.state.state === PageRenderState.Login;
    }

    renderLogin() {
        return <Login onLogin={this.onLogin.bind(this)} />;
    }

    renderEphemeral() {
        return (
            <Ephemeral
                getDestroy={this.getDestroy.bind(this)}
                onLogout={this.onLogout.bind(this)}
                updateConns={(state: Connections.ConnectionCountState) => {
                    this.updateConns!(state);
                }}
                updateIdent={(state: Connections.ConnectionIdentState) => {
                    this.updateIdent!(state);
                }}
            />
        );
    }

    renderContent() {
        if (this.loginIsActive()) return this.renderLogin();
        else return this.renderEphemeral();
    }

    render() {
        return (
            <>
                <Header
                    renderLogout={!this.loginIsActive()}
                    onLogout={this.onLogout.bind(this)}
                    getConnsUpdater={this.getConnsUpdater.bind(this)}
                    getIdentUpdater={this.getIdentUpdater.bind(this)}
                    getClear={this.getHeaderClear.bind(this)}
                />
                {this.renderContent()}
            </>
        );
    }
}

document.addEventListener("DOMContentLoaded", () => {
    ReactDOM.render(<Page />, document.getElementById("page"));
});
