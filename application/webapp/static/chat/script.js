window.addEventListener("load", async (event) => {
    console.log(`Loaded game "${document.title}"`);
    const Action = window.Action;

    const button = document.getElementById("send");
    const input = document.getElementById("input");
    const messages = document.getElementById("messages");
    let users = {};

    function addMessage(payload, sent) {
        sent = sent || false;
        const p = document.createElement("p");
        if (!sent && payload.data["u"] in users && users[payload.data["u"]]["photo"] !== null) {
            const i = document.createElement("img");
            i.src = `data:image/png;base64,${users[payload.data["u"]]["photo"]}`;
            i.style.cssText = "border-radius: 100%; max-width: 50px;";
            p.appendChild(i);
        }
        const t = document.createTextNode(sent ? payload : payload.data.data.text);
        p.appendChild(t);
        if (sent) {
            p.classList.add("sent");
        }
        messages.appendChild(p);
    }

    button.addEventListener("click", (e) => {
        window.room.broadcast({"text": input.value});
        addMessage(input.value, true)
        input.value = "";
    });

    window.room.listenCallback = (room, payload) => {
        switch (payload.action) {
            case Action.INFO_LIST: {
                users = payload.data["users"].reduce((obj, x) => {
                    obj[x.id] = x;
                    return obj;
                }, {});
                break;
            }
            case Action.JOINED: {
                users[payload.data.id] = payload.data;
                break;
            }
            case Action.LEFT: {
                delete users[payload.data.id];
                break;
            }
            case Action.BROADCAST: {
                addMessage(payload);
                break;
            }
            default: {
                addMessage(JSON.stringify(payload), true);
                break;
            }
        }
    };
});
