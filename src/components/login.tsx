import * as React from "react";
import localforage from "localforage";
import { IdentityTypes } from "../identity";

interface LoginState {
    idmgmt: IdentityTypes;
    validID: boolean;
    oldname: string;
}

export default class Login extends React.Component<{}, LoginState> {
    timer: ReturnType<typeof setInterval> | null = null;
    nameRef: React.RefObject<HTMLInputElement> = React.createRef();

    constructor(props: {}) {
        super(props);

        this.state = {
            idmgmt: IdentityTypes.Guest,
            validID: false,
            oldname: "",
        };
    }

    handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const name = this.nameRef.current!.value;
        localStorage.setItem("name", name);
        sessionStorage.setItem("name", name);
        // TODO use state instead of DOM queries
        const idmgmt = (document.querySelector(
            'input[name="idmgmt"]:checked'
        ) as HTMLInputElement).value;
        if (idmgmt !== IdentityTypes.CreateId)
            localStorage.setItem("idmgmt", idmgmt);
        else localStorage.setItem("idmgmt", IdentityTypes.ReuseId);
        sessionStorage.setItem("idmgmt", idmgmt);

        if (idmgmt !== IdentityTypes.Guest && !name)
            alert("You need a name when creating or reusing an ID");
        else {
            window.location.href = "./ephemeral.html";
        }
    }

    async validate() {
        const name = this.nameRef.current!.value;
        if (name === this.state.oldname) return;

        let pass = false;
        if (name != "") {
            const datastore = localforage.createInstance({ name: name });
            const gid = await datastore.getItem("gid");
            pass = Boolean(gid);
        }

        this.setState((state) => {
            let idmgmt = state.idmgmt;
            if (!pass) {
                if (idmgmt === IdentityTypes.ReuseId)
                    idmgmt = IdentityTypes.CreateId;
            }

            return { oldname: name, idmgmt: idmgmt, validID: pass };
        });

        return pass;
    }

    startValidation() {
        if (this.timer == null)
            this.timer = setInterval(this.validate.bind(this), 100);
    }

    stopValidation() {
        if (this.timer == null) return;
        clearInterval(this.timer);
        this.timer = null;
    }

    componentDidMount() {
        const savedName = localStorage.getItem("name");
        if (savedName) {
            this.nameRef.current!.value = savedName;
        }

        const savedIdmgmt = localStorage.getItem("idmgmt");
        if (savedIdmgmt) {
            this.setState((s) => {
                return { ...s, idmgmt: savedIdmgmt as IdentityTypes };
            });
        }

        this.validate();
    }

    render() {
        return (
            <div id="content">
                <form onSubmit={this.handleSubmit.bind(this)} id="login">
                    <label htmlFor="name">Name:</label>
                    <input
                        id="name"
                        onFocus={this.startValidation.bind(this)}
                        onBlur={this.stopValidation.bind(this)}
                        ref={this.nameRef}
                    />
                    <br />
                    <label htmlFor="guest">Login as guest</label>
                    <input
                        type="radio"
                        id="guest"
                        value={IdentityTypes.Guest}
                        name="idmgmt"
                        checked={this.state.idmgmt == IdentityTypes.Guest}
                        onClick={() => {
                            this.setState((s) => {
                                return { ...s, idmgmt: IdentityTypes.Guest };
                            });
                        }}
                    />
                    <br />
                    <label htmlFor="createid">Create ID</label>
                    <input
                        type="radio"
                        id="createid"
                        value={IdentityTypes.CreateId}
                        name="idmgmt"
                        checked={this.state.idmgmt == IdentityTypes.CreateId}
                        onClick={() => {
                            this.setState((s) => {
                                return { ...s, idmgmt: IdentityTypes.CreateId };
                            });
                        }}
                    />
                    <br />
                    <label
                        id="reuseidlabel"
                        htmlFor="reuseid"
                        style={{
                            textDecoration: !this.state.validID
                                ? "line-through"
                                : "",
                        }}
                    >
                        Use saved ID
                    </label>
                    <input
                        type="radio"
                        id="reuseid"
                        value={IdentityTypes.ReuseId}
                        name="idmgmt"
                        checked={this.state.idmgmt == IdentityTypes.ReuseId}
                        onClick={() => {
                            this.setState((s) => {
                                return { ...s, idmgmt: IdentityTypes.ReuseId };
                            });
                        }}
                        disabled={!this.state.validID}
                    />
                </form>
                <a
                    className="btn"
                    id="start"
                    onClick={this.handleSubmit.bind(this)}
                >
                    Connect to Ephemeral!
                </a>
            </div>
        );
    }
}
