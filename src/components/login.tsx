import * as React from "react";
import localforage from "localforage";
import { IdentityTypes } from "../identity";

export default class Login extends React.Component<{}, {}> {
    timer: ReturnType<typeof setInterval> | null = null;
    nameRef: React.RefObject<HTMLInputElement> = React.createRef();

    handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

        const name = this.nameRef.current!.value;
        localStorage.setItem("name", name);
        sessionStorage.setItem("name", name);
        // TODO use state instead of DOM queries
        const idmgmt = (document.querySelector(
            'input[name="idmgmt"]:checked'
        ) as HTMLInputElement).value;
        if (idmgmt !== IdentityTypes.CreateId) localStorage.setItem("idmgmt", idmgmt);
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
        const reuseid = document.getElementById("reuseid") as HTMLInputElement;
        const reuseidlabel = document.getElementById(
            "reuseidlabel"
        ) as HTMLElement;
        let disable = true;
        if (name != "") {
            const datastore = localforage.createInstance({ name: name });
            const gid = await datastore.getItem("gid");
            disable = !Boolean(gid);
        }

        reuseid.disabled = disable;
        if (disable) reuseidlabel.style.textDecoration = "line-through";
        else reuseidlabel.style.textDecoration = "";
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
            (document.getElementById(
                savedIdmgmt
            ) as HTMLInputElement).checked = true;
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
                        checked
                    />
                    <br />
                    <label htmlFor="createid">Create ID</label>
                    <input
                        type="radio"
                        id="createid"
                        value={IdentityTypes.CreateId}
                        name="idmgmt"
                    />
                    <br />
                    <label id="reuseidlabel" htmlFor="reuseid">
                        Use saved ID
                    </label>
                    <input
                        type="radio"
                        id="reuseid"
                        value={IdentityTypes.ReuseId}
                        name="idmgmt"
                        disabled
                    />
                </form>
                <button type="submit" form="login" id="start">
                    Connect to Ephemeral!
                </button>
            </div>
        );
    }
}
