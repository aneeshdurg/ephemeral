import * as React from "react";
import * as ReactDOM from "react-dom";

import "./testObject";

class EphemeralTest extends React.Component<{}, {}> {
    render() {
        return (
            <>
                See <code>window.test</code> for the test objects!
            </>
        );
    }
}

document.addEventListener("DOMContentLoaded", () => {
    ReactDOM.render(<EphemeralTest />, document.body);
});
