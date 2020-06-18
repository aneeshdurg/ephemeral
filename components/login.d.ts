import * as React from "react";
import { IdentityTypes } from "../identity";
interface LoginState {
    idmgmt: IdentityTypes;
    validID: boolean;
    oldname: string;
}
export default class Login extends React.Component<{}, LoginState> {
    timer: ReturnType<typeof setInterval> | null;
    nameRef: React.RefObject<HTMLInputElement>;
    constructor(props: {});
    handleSubmit(e: React.FormEvent): void;
    validate(): Promise<boolean | undefined>;
    startValidation(): void;
    stopValidation(): void;
    componentDidMount(): void;
    render(): JSX.Element;
}
export {};
