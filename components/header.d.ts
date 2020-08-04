import * as React from "react";
import { ConnectionsUpdaterCB, IdentUpdaterCB } from "./connections";
export interface HeaderProps {
    renderLogout: boolean;
    getConnsUpdater?: (updater: ConnectionsUpdaterCB) => void;
    getIdentUpdater?: (updater: IdentUpdaterCB) => void;
    onLogout?: () => void;
}
export default class Header extends React.Component<HeaderProps, {}> {
    onLogout(): void;
    render(): JSX.Element;
}
