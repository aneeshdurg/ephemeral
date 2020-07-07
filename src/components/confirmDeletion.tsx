import * as React from "react";

interface ConfirmDeletionProps {
    onCancel: () => void;
    onOK: () => void;
    expectedName: string;
}

export default class ConfirmDeletion extends React.Component<ConfirmDeletionProps, {}> {
    timer: ReturnType<typeof setInterval> | null = null;
    nameRef: React.RefObject<HTMLInputElement> = React.createRef();
    okRef: React.RefObject<HTMLAnchorElement> = React.createRef();

    async validate() {
        const name = this.nameRef.current!.value;
        if (name == this.props.expectedName)
            this.okRef.current!.classList.remove("btn-disabled");
        else
            this.okRef.current!.classList.add("btn-disabled");
    }

    startValidation() {
        if (this.timer == null)
            this.timer = setInterval(this.validate.bind(this), 100);
    }

    stopValidation() {
        if (this.timer != null) {
            clearInterval(this.timer!);
            this.timer = null;
        }
    }

    onClick(e: any) {
        if (e.target.class == "modal") {
            this.props.onCancel();
        }
    }

    onOk() {
        if (this.nameRef.current!.value == this.props.expectedName) {
            this.props.onOK();
        }
    }

    keyup(e: any) {
        if (e.key == "Enter")
            this.onOk();
        console.log(e.key);
    }

    render() {
        return (
            <div onClick={this.onClick.bind(this)} className="modal">
                <div className="modal-content">
                    <p>
                        Warning! Found an existing identity for {this.props.expectedName}.
                        Please type {this.props.expectedName} to confirm deletion.
                    </p>
                    <input
                        onBlur={this.stopValidation.bind(this)}
                        onFocus={this.startValidation.bind(this)}
                        onKeyUp={this.keyup.bind(this)}
                        ref={this.nameRef} />
                    <br />
                    <br />
                    <a onClick={this.props.onCancel} className="btn">Cancel</a>
                    <a
                        ref={this.okRef}
                        onClick={this.onOk.bind(this)}
                        className="btn btn-disabled"
                    >Ok</a>
                </div>
            </div>
        );
    }
}
