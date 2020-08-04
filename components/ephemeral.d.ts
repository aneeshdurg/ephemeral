import * as React from "react";
import { FilterCB } from "./postList";
import { ConnectionsUpdaterCB, IdentUpdaterCB } from "./connections";
import * as Post from "../post";
import { Client } from "../client";
import { AddPostCB } from "../ui";
interface ConfirmDeleteParams {
    name: string;
    callback: (cancelled: boolean) => void;
}
interface AlertParams {
    contents: string;
    callback: () => void;
}
interface EphemeralState {
    alertParams: AlertParams | null;
    consoleMode: boolean;
    confirmDeleteParams: ConfirmDeleteParams | null;
}
interface EphemeralProps {
    onLogout: () => void;
    getDestroy: (d: () => void) => void;
    updateConns: ConnectionsUpdaterCB;
    updateIdent: IdentUpdaterCB;
}
export default class Ephemeral extends React.Component<EphemeralProps, EphemeralState> {
    renderPost: AddPostCB | null;
    setFilter: FilterCB | null;
    _client: Client | null;
    consoleRef: React.RefObject<HTMLDivElement>;
    searchRef: React.RefObject<HTMLInputElement>;
    get client(): Client;
    constructor(props: EphemeralProps);
    enableConsoleMode(): void;
    disableConsoleMode(): void;
    raiseConfirmDelete(name: string, callback: (b: boolean) => void): void;
    clearConfirmDelete(): void;
    raiseAlert(contents: string, callback: () => void): void;
    clearAlert(): void;
    getAddPost(addPost: AddPostCB): void;
    getSetFilter(setFilter: FilterCB): void;
    addPost(contents: string, parent: string | null): Promise<void>;
    editPost(contents: string, post: Post.Post): Promise<void>;
    componentDidMount(): void;
    render(): JSX.Element;
}
export {};
