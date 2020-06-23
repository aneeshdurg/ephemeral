import * as React from "react";
import localforage from "localforage";

export default class Login extends React.Component<{}, {}> {
    timer: ReturnType<typeof setInterval> | null = null;
    nameEl: HTMLInputElement | null = null;

    handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

        const name = this.nameEl!.value;
        localStorage.setItem("name", name);
        sessionStorage.setItem("name", name);
        // TODO use state instead of DOM queries
        const idmgmt = (document.querySelector(
            'input[name="idmgmt"]:checked'
        ) as HTMLInputElement).value;
        if (idmgmt != "createid") localStorage.setItem("idmgmt", idmgmt);
        else localStorage.setItem("idmgmt", "reuseid");
        sessionStorage.setItem("idmgmt", idmgmt);

        if (idmgmt != "guest" && !name)
            alert("You need a name when creating or reusing an ID");
        else {
            window.location.href = "./ephemeral.html";
        }
    }

    async validate() {
        const name = this.nameEl!.value;
        const reuseid = document.getElementById("reuseid") as HTMLInputElement;
        const reuseidlabel = document.getElementById(
            "reuseidlabel"
        ) as HTMLElement;
        let disable = true;
        if (name != "") {
            const datastore = localforage.createInstance({ name: name });
            const gid = await datastore.getItem("gid");
            console.log("Got gid", gid, `'${name}'`);

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
        this.nameEl = document.getElementById("name") as HTMLInputElement;
        const savedName = localStorage.getItem("name");
        if (savedName) {
            this.nameEl!.value = savedName;
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
                    />
                    <br />
                    <label htmlFor="guest">Login as guest</label>
                    <input
                        type="radio"
                        id="guest"
                        value="guest"
                        name="idmgmt"
                        checked
                    />
                    <br />
                    <label htmlFor="createid">Create ID</label>
                    <input
                        type="radio"
                        id="createid"
                        value="createid"
                        name="idmgmt"
                    />
                    <br />
                    <label id="reuseidlabel" htmlFor="reuseid">
                        Use saved ID
                    </label>
                    <input
                        type="radio"
                        id="reuseid"
                        value="reuseid"
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
