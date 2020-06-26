import * as React from "react";

// TODO make this a stateful component that passes up functors to change the
// number of connections etc.
export default class Connections extends React.Component<{}, {}> {
    render() {
        return (
            <code>
                <span id="peerid">????</span>
                <br />
                <b>
                    <span id="name">????</span>
                </b>
                @<span id="id">????</span>
                <br />
                connections: <span id="activeconnections">0</span>/
                <span id="totalconnections">0</span>
            </code>
        );
    }
}
