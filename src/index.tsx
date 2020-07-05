import * as React from "react";
import * as ReactDOM from "react-dom";

import Header from "./components/header";
import Login from "./components/login";

document.addEventListener("DOMContentLoaded", () => {
    ReactDOM.render(
        <>
            <Header renderLogout={false} />
            <Login />
        </>,
        document.getElementById("page")
    );
});
