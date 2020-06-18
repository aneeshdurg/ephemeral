import * as React from "react";

interface AlertProps {
    onOK: () => void;
    contents: string;
}

// TODO make ConfirmDeletion depend on Alert
export default class Alert extends React.Component<AlertProps, {}> {
    timer: ReturnType<typeof setInterval> | null = null;
    nameRef: React.RefObject<HTMLInputElement> = React.createRef();
    okRef: React.RefObject<HTMLAnchorElement> = React.createRef();

    onClick(e: any) {
        if (e.target.class == "modal") {
            this.props.onOK();
        }
    }

    render() {
        return (
            <div onClick={this.onClick.bind(this)} className="modal">
                <div className="modal-content">
                    <p>{this.props.contents}</p>
                    <br />
                    <a onClick={this.props.onOK} className="btn">
                        Ok
                    </a>
                </div>
            </div>
        );
    }
}
