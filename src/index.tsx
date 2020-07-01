import * as React from "react";
import * as ReactDOM from "react-dom";

import Header from "./components/header";
import Login from "./components/login";
import "./debug";

document.addEventListener("DOMContentLoaded", () => {
    ReactDOM.render(
        <>
            <Header renderLogout={false} />
            <Login />
        </>,
        document.getElementById("page")
    );
});
