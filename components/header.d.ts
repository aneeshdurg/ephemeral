import * as React from "react";
import { ConnectionsUpdaterCB, IdentUpdaterCB } from "./connections";
export interface HeaderProps {
    renderLogout: boolean;
    onLogout?: () => void;
    getConnsUpdater: (updater: ConnectionsUpdaterCB) => void;
    getIdentUpdater: (updater: IdentUpdaterCB) => void;
    getClear: (clear: () => void) => void;
}
export default class Header extends React.Component<HeaderProps, {}> {
    onLogout(): void;
    render(): JSX.Element;
}
