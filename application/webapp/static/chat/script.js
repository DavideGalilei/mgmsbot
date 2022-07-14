window.addEventListener("load", async (event) => {
    console.log(`Loaded game "${document.title}"`);
    const Action = window.Action;

    const button = document.getElementById("send");
    const input = document.getElementById("input");
    const messages = document.getElementById("messages");
    const online = document.getElementById("online");
    const body = document.querySelector("body");

    input.focus();
    let users = {};

    input.addEventListener("keypress", (e) => {
        if (e.key === "Enter" && e.target.value.trim()) {
            button.click();
        }
    })

    function updateOnline() {
        online.innerText = `Online users: ${Object.values(users).map((x) => x.name).join(", ")}`;
    }

    function addMessage(payload, addClass) {
        if (!(addClass ? payload : payload.data.data.text)) {
            return;
        }
        addClass = addClass || false;
        const p = document.createElement("p");

        const user = (payload.data || addClass === "sent") && users[addClass === "sent" ? window.room.data["decrypted"].i : payload.data["u"]];
        if (user && user["photo"] !== null) {
            const i = document.createElement("img");
            i.src = `data:image/png;base64,${user["photo"]}`;
            i.style.cssText = "border-radius: 100%; max-width: 50px;";
            p.appendChild(i);
        }
        const t = document.createTextNode(addClass ? payload : payload.data.data.text);
        p.appendChild(t);
        if (!!addClass) {
            p.classList.add(addClass);
        }
        messages.appendChild(p);
        body.scrollIntoView({ behavior: "smooth", block: "end" });
    }

    button.addEventListener("click", (e) => {
        if (!(input.value.trim())) return;

        window.room.broadcast({"text": input.value.trim()});
        addMessage(input.value, "sent")
        input.value = "";
    });

    window.room.listenCallback = (room, payload) => {
        switch (payload.action) {
            case Action.INFO_LIST: {
                users = payload.data["users"].reduce((obj, x) => {
                    obj[x.id] = x;
                    return obj;
                }, {});
                updateOnline();
                break;
            }
            case Action.JOINED: {
                users[payload.data.id] = payload.data;
                addMessage(`${users[payload.data.id].name} joined the chat`, "joined");
                updateOnline();
                break;
            }
            case Action.LEFT: {
                addMessage(`${users[payload.data.id].name} left the chat`, "left");
                delete users[payload.data.id];
                updateOnline();
                break;
            }
            case Action.BROADCAST: {
                addMessage(payload);
                break;
            }
            default: {
                addMessage(JSON.stringify(payload), "debug");
                break;
            }
        }
    };
});
