import * as JsStore from "jsstore";
import * as React from "react";

import { IdentityTypes } from "../identity";
import * as Db from "../db";

interface LoginProps {
    onLogin: () => void;
}

interface LoginState {
    idmgmt: IdentityTypes;
    validID: boolean;
    oldname: string;
}

export default class Login extends React.Component<LoginProps, LoginState> {
    timer: ReturnType<typeof setInterval> | null = null;
    nameRef: React.RefObject<HTMLInputElement> = React.createRef();
    dbConn: JsStore.Connection;

    constructor(props: LoginProps) {
        super(props);
        this.dbConn = new JsStore.Connection(Db.getWorker());

        this.state = {
            idmgmt: IdentityTypes.Guest,
            validID: false,
            oldname: "",
        };
    }

    dbList: string[] = [];
    async initDbList() {
        this.dbList = await this.dbConn.getDbList();
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
            // window.location.href = "./ephemeral.html";
            this.props.onLogin();
        }
    }

    async validate() {
        const name = this.nameRef.current!.value;
        if (name === this.state.oldname) return;

        let pass = false;
        if (name != "") {
            // TODO create a method on Identity.Database to get this name
            pass = Boolean(this.dbList.find((n) => n === `${name}::ident`));
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

        (async () => {
            await this.initDbList();
            await this.validate();
        })();
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
                        defaultChecked={
                            this.state.idmgmt == IdentityTypes.Guest
                        }
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
                        defaultChecked={
                            this.state.idmgmt == IdentityTypes.CreateId
                        }
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
                        defaultChecked={
                            this.state.idmgmt == IdentityTypes.ReuseId
                        }
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
