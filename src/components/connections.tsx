import * as React from "react";

export interface ConnectionIdentState {
    name: string;
    peerid: string;
    id: string;
    idColor: string | null;
}

export interface ConnectionCountState {
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
    getClear: (clear: () => void) => void;
}

function getDefaultCountState(): ConnectionCountState {
    return {
        active: 0,
        total: 0,
    };
}

function getDefaultIdentState(): ConnectionIdentState {
    return {
        name: "???",
        peerid: "???",
        id: "???",
        idColor: null,
    };
}

function getDefaultState(): ConnectionState {
    return {
        countState: getDefaultCountState(),
        identState: getDefaultIdentState(),
    };
}

export default class Connections extends React.Component<
    ConnectionProps,
    ConnectionState
> {
    constructor(props: ConnectionProps) {
        super(props);
        this.props.getIdentUpdater(this.updateIdent.bind(this));
        this.props.getConnsUpdater(this.updateCount.bind(this));
        this.props.getClear(this.clear.bind(this));
        this.state = getDefaultState();
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

    clear() {
        this.setState(getDefaultState());
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
