import * as React from "react";

export interface ConnectionState {
    name: string;
    peerid: string;
    id: string;
    idColor: string | null;
}

export type ConnectionUpdaterCB = (state: ConnectionState) => void;
export interface ConnectionProps {
    getUpdater: (updater: ConnectionUpdaterCB) => void;
}

// TODO make this a stateful component that passes up functors to change the
// number of connections etc.
export default class Connections extends React.Component<
    ConnectionProps,
    ConnectionState
> {
    constructor(props: ConnectionProps) {
        super(props);
        this.props.getUpdater(this.setState.bind(this));
        this.state = {
            name: "???",
            peerid: "???",
            id: "???",
            idColor: null,
        };
    }

    render() {
        const idStyle = this.state.idColor ? { color: this.state.idColor } : {};
        return (
            <code>
                <span id="peerid">{this.state.peerid}</span>
                <br />
                <b>
                    <span id="name">{this.state.name}</span>
                </b>
                @
                <span id="id" style={idStyle}>
                    {this.state.id}
                </span>
                <br />
                connections: <span id="activeconnections">0</span>/
                <span id="totalconnections">0</span>
            </code>
        );
    }
}
