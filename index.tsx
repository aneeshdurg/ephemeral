import * as React from "react";
import * as ReactDOM from "react-dom";

import Header from "./components/header";
import Login from "./components/login";
import Ephemeral from "./components/ephemeral";

enum PageRenderState {
    Login,
    Ephemeral
}

interface PageState {
    state: PageRenderState;
}

class Page extends React.Component<{}, PageState> {
    constructor(props: {}) {
        super(props);

        const params = new URLSearchParams(window.location.search);
        this.state = {
            state: params.get("page") === "ephemeral" ?
                PageRenderState.Ephemeral : PageRenderState.Login
        };
    }

    onLogin() {
        this.setState({state: PageRenderState.Ephemeral});
        history.pushState({}, 'Ephemeral', window.location + '?page=ephemeral');
    }

    ephemeralDestructor: () => void = () => {};
    getDestroy(destructor: () => void) {
        this.ephemeralDestructor = destructor;
    }

    onLogout() {
        this.setState({state: PageRenderState.Login});
        this.ephemeralDestructor();
        history.pushState(
            {},
            'Login',
            (new URL(window.location + '')).pathname
        );
    }

    renderLogin() {
        return (
            <>
                <Header renderLogout={false} />
                <Login onLogin={this.onLogin.bind(this)}/>
            </>
        );
    }

    renderPage() {
        if (this.state.state === PageRenderState.Login)
            return this.renderLogin();
        else
            return <Ephemeral
                getDestroy={this.getDestroy.bind(this)}
                onLogout={this.onLogout.bind(this)}
            />;
    }

    render() {
        // TODO render the header here and pass in header callbacks to Ephemeral
        return this.renderPage();
    }
}

document.addEventListener("DOMContentLoaded", () => {
    ReactDOM.render(<Page />, document.getElementById("page"));
});
