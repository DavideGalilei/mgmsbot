window.addEventListener("load", async (event) => {
    console.log(`Loaded test game "${document.title}"`);
    const Action = window.Action;

    const count = document.getElementById("count");
    const players = document.getElementById("players");
    let users = {};

    function refreshCount() {
        count.innerText = `Online users: ${Object.keys(users).length}`;
    }

    function addPlayer(player) {
        const p = document.createElement("p");
        if (player["photo"] !== null) {
            const i = document.createElement("img");
            i.src = `data:image/png;base64,${player["photo"]}`;
            i.style.cssText = "border-radius: 100%; max-width: 50px;";
            p.appendChild(i);
        }
        const t = document.createTextNode(JSON.stringify(player));
        p.appendChild(t);

        players.appendChild(p);
        return p;
    }

    function removePlayer(player) {
        users[player.id].elem.remove();
    }

    window.room.listenCallback = (room, payload) => {
        switch (payload.action) {
            case Action.INFO_LIST: {
                users = payload.data["users"].reduce((obj, player) => {
                    obj[player.id] = {player, elem: addPlayer(player)};
                    return obj;
                }, {});
                break;
            }
            case Action.JOINED: {
                users[payload.data.id] = {player: payload.data.id, elem: addPlayer(payload.data)};
                break;
            }
            case Action.LEFT: {
                removePlayer(payload.data)
                delete users[payload.data.id];
                break;
            }
        }
        refreshCount();
    };
});
