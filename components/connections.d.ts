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
export declare type ConnectionsUpdaterCB = (state: ConnectionCountState) => void;
export declare type IdentUpdaterCB = (state: ConnectionIdentState) => void;
export interface ConnectionProps {
    getConnsUpdater: (updater: ConnectionsUpdaterCB) => void;
    getIdentUpdater: (updater: IdentUpdaterCB) => void;
    getClear: (clear: () => void) => void;
}
export default class Connections extends React.Component<ConnectionProps, ConnectionState> {
    constructor(props: ConnectionProps);
    updateIdent(identState: ConnectionIdentState): void;
    updateCount(countState: ConnectionCountState): void;
    clear(): void;
    render(): JSX.Element;
}
export {};
