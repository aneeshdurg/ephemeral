import localforage from "localforage";

document.addEventListener("DOMContentLoaded", () => {
    const nameEl = <HTMLInputElement>document.getElementById("name");
    const reuseid = <HTMLInputElement>document.getElementById('reuseid')!;
    const reuseidlabel = <HTMLElement>document.getElementById('reuseidlabel')!;

    async function validate() {
        const name = nameEl.value;
        if (name == "")
            return;
        const datastore = localforage.createInstance({name: name});
        const gid = await datastore.getItem("gid");
        console.log("Got gid", gid, `'${name}'`);

        const disable = !Boolean(gid);
        reuseid.disabled = disable;
        if (disable)
            reuseidlabel.style.textDecoration = "line-through";
        else
            reuseidlabel.style.textDecoration = "";
    };

    const savedName = localStorage.getItem("name");
    if (savedName) {
        nameEl.value = savedName;
    }

    const savedIdmgmt = localStorage.getItem("idmgmt");
    if (savedIdmgmt) {
        (<HTMLInputElement>document.getElementById(savedIdmgmt)).checked = true;
    }

    validate();
    let timer: number | null = null;
    nameEl.addEventListener('focus', () => {
        if (timer == null)
            timer = setInterval(validate, 100);
    });
    nameEl.addEventListener('blur', () => {
        if (timer == null)
            return;
        clearInterval(timer);
        timer = null;
    });

    document.getElementById("login")!.onsubmit = (e) => {
        e.preventDefault();

        const name = nameEl.value;
        localStorage.setItem("name", name);
        sessionStorage.setItem("name", name);
        const idmgmt = (<HTMLInputElement>document.querySelector(
            'input[name="idmgmt"]:checked'
        )!).value;
        if (idmgmt != "createid")
            localStorage.setItem("idmgmt", idmgmt);
        else localStorage.setItem("idmgmt", "reuseid");
        sessionStorage.setItem("idmgmt", idmgmt);

        if (idmgmt != "guest" && !name)
            alert("You need a name when creating or reusing an ID");
        else {
            window.location.href = "./ephemeral.html";
        }
    };
});
