
function addCard(container, type, classes = []) {
    let card = document.createElement("img");
    card.src = "/static/uno/cards/" + type + ".svg";
    card.alt = "card";
    card.classList.add("card");
    classes.forEach((className) => {
        card.classList.add(className);
    });
    container.appendChild(card);
    return card;
}

class Deck {

    constructor() {
        this.cards = [
            "red-0",
            ""
        ];
    }

}

window.addEventListener("load", async (event) => {
    console.log(`Loaded test game "${document.title}"`);
    const Action = window.Action;

    let me = null;
    let users = {};
    let started = false;
    let host = null;
    let playersDiv = document.getElementById("players");
    let players = [];

    class Player {

        constructor(user) {
            let player = document.createElement("div");
            player.classList.add("player");
            let photo = document.createElement("img");
            photo.alt = "profile picture";
            photo.src = `data:image/png;base64,${user["photo"]}`;
            photo.classList.add("player-photo");
            player.appendChild(photo);
            let deck = document.createElement("div");
            deck.classList.add("player-deck");
            player.appendChild(deck);
            this.player = player;
            this.user = user;
            this.deck = deck;

            this.addCard("stroke-back");
            playersDiv.appendChild(player);
            players.push(player);
        }

        addCard(type, classes = []) {
            addCard(this.deck, type, classes);
        }

    }

    window.room.listenCallback = (room, payload) => {
        switch (payload.action) {
            case Action.INFO_LIST: {
                users = {};
                payload.data["users"].forEach((user, index) => {
                    if (user.id !== window.room.data["decrypted"].i) {
                        user.player = new Player(user);
                        users[user.id] = user;
                    } else {
                        me = user;
                    }
                    if (index === 0) {
                        host = user;
                    }
                })

                if (host === me) {

                }
                break;
            }
            case Action.JOINED: {
                payload.data.player = new Player(payload.data);
                users[payload.data.id] = payload.data;
                break;
            }
            case Action.LEFT: {
                playersDiv.removeChild(users[payload.data.id].player.player);
                delete users[payload.data.id];
                break;
            }
            case Action.SEND_USER: {
                break;
            }
        }
        console.log(users);
    };
});
