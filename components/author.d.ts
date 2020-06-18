import * as React from "react";
import { Identity } from "../identity";
export interface AuthorProps {
    ident: Identity;
}
export interface AuthorState {
    expanded: boolean;
}
export default class Author extends React.Component<AuthorProps, AuthorState> {
    constructor(props: AuthorProps);
    toggleExpand(): void;
    render(): JSX.Element;
}
