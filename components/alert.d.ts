import * as React from "react";
interface AlertProps {
    onOK: () => void;
    contents: string;
}
export default class Alert extends React.Component<AlertProps, {}> {
    timer: ReturnType<typeof setInterval> | null;
    nameRef: React.RefObject<HTMLInputElement>;
    okRef: React.RefObject<HTMLAnchorElement>;
    onClick(e: any): void;
    render(): JSX.Element;
}
export {};
