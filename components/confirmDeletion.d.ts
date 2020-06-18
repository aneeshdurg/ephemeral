import * as React from "react";
interface ConfirmDeletionProps {
    onCancel: () => void;
    onOK: () => void;
    expectedName: string;
}
export default class ConfirmDeletion extends React.Component<ConfirmDeletionProps, {}> {
    timer: ReturnType<typeof setInterval> | null;
    nameRef: React.RefObject<HTMLInputElement>;
    okRef: React.RefObject<HTMLAnchorElement>;
    validate(): Promise<void>;
    startValidation(): void;
    stopValidation(): void;
    onClick(e: any): void;
    onOk(): void;
    keyup(e: any): void;
    render(): JSX.Element;
}
export {};
