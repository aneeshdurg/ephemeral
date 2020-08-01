import * as React from "react";

interface ConnectionIdentState {
    name: string;
    peerid: string;
    id: string;
    idColor: string | null;
}

interface ConnectionCountState {
    active: number;
    total: number;
}

interface ConnectionState {
    countState: ConnectionCountState;
    identState: ConnectionIdentState;
}

export type ConnectionsUpdaterCB = (state: ConnectionCountState) => void;
export type IdentUpdaterCB = (state: ConnectionIdentState) => void;
export interface ConnectionProps {
    getConnsUpdater: (updater: ConnectionsUpdaterCB) => void;
    getIdentUpdater: (updater: IdentUpdaterCB) => void;
}

export default class Connections extends React.Component<
    ConnectionProps,
    ConnectionState
> {
    constructor(props: ConnectionProps) {
        super(props);
        this.props.getIdentUpdater(this.updateIdent.bind(this));
        this.props.getConnsUpdater(this.updateCount.bind(this));
        this.state = {
            countState: {
                active: 0,
                total: 0,
            },
            identState: {
                name: "???",
                peerid: "???",
                id: "???",
                idColor: null,
            },
        };
    }

    updateIdent(identState: ConnectionIdentState) {
        this.setState((state) => {
            return { ...state, identState: identState };
        });
    }

    updateCount(countState: ConnectionCountState) {
        this.setState((state) => {
            return { ...state, countState: countState };
        });
    }

    render() {
        const idColor = this.state.identState.idColor;
        const idStyle = idColor ? { color: idColor } : {};
        return (
            <code>
                <span id="peerid">{this.state.identState.peerid}</span>
                <br />
                <b>
                    <span id="name">{this.state.identState.name}</span>
                </b>
                @
                <span id="id" style={idStyle}>
                    {this.state.identState.id}
                </span>
                <br />
                connections:{" "}
                <span id="activeconnections">
                    {this.state.countState.active}
                </span>
                /
                <span id="totalconnections">{this.state.countState.total}</span>
            </code>
        );
    }
}
