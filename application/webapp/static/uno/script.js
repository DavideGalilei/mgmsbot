function loadScript(src) {
    let tag = document.createElement('script');
    tag.src = src;
    let firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
}

const clamp = (num, min, max) => Math.min(Math.max(num, min), max);
const lerp = (start, end, amt) => (1-amt) * start + amt * end;


// https://stackoverflow.com/a/69419420
function timeout(time_ms) {
    return new Promise(resolve => setTimeout(resolve, time_ms));
}

// https://stackoverflow.com/a/2117523
function uuid4() {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}

// https://stackoverflow.com/a/1038781
function getWidth() {
    return Math.max(
        document.body.scrollWidth,
        document.documentElement.scrollWidth,
        document.body.offsetWidth,
        document.documentElement.offsetWidth,
        document.documentElement.clientWidth
    );
}

function getHeight() {
    return Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.offsetHeight,
        document.documentElement.clientHeight
    );
}

// https://stackoverflow.com/a/42769683
function remToPixels(rem) {
    return rem * parseFloat(getComputedStyle(document.documentElement).fontSize);
}

// https://stackoverflow.com/a/48363660
function randomPic(id) {
    let canvas = document.createElement("canvas");
    canvas.width = canvas.height = 4;
    let ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;

    let imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < imgData.data.length; i += 4) {
        imgData.data[i] = id++ % 255; // red
        imgData.data[i + 1] = (id++) * 32 % 255; // green
        imgData.data[i + 2] = (id++) * 128 % 255; // blue
        imgData.data[i + 3] = 255; // alpha
    }

    ctx.putImageData(imgData, 0, 0);
    return canvas;
}

const sign = (n) => (!!n) * 2 - 1;


// Get mouse pos
// https://stackoverflow.com/a/22986867
let
    mouseX = 0,
    mouseY = 0;

function onMouseUpdate(e) {
  mouseX = e.pageX;
  mouseY = e.pageY;
}

function onTouchMove(e) {
    // https://stackoverflow.com/a/61732450
    let evt = (typeof e.originalEvent === 'undefined') ? e : e.originalEvent;
    let touch = evt.touches[0] || evt.changedTouches[0];
    mouseX = touch.pageX;
    mouseY = touch.pageY;
}

document.addEventListener("mousemove", onMouseUpdate, false);
document.addEventListener("mouseenter", onMouseUpdate, false);

document.addEventListener("touchstart", onTouchMove, false);
document.addEventListener("touchmove", onTouchMove, false);
document.addEventListener("touchcancel", onTouchMove, false);


const PacketType = Object.freeze({
    GameInit: 0,
    GameStarted: 1,
    CardOverlap: 2,
    CardOverlapSuccessful: 3,
    MainCardUpdate: 4,
    UserAddCard: 5,
    UserRemoveCard: 6,
    SelectedColor: 7,
    TakeCard: 8
});

// User variables
let me = null;
let users = {};
let started = false;
let playersDiv = null;
let myDeck = null;
let mainDeck = null;
let mainCard = null;
let myCards = [];
let players = [];
let userPlaying = null;
let playersIDs = [];
let host = null;
let callbacks = {};

function getMainCard() {
    return document.querySelector(".main");
}

function setMainCard(card) {
    if (mainDeck.children.length > 0) {
        mainDeck.replaceChild(getCard(card, ["main"]), mainDeck.children[0]);
    }
    else {
        addCard(mainDeck, card, ["main"]);
    }
    mainCard = card;
}

const Colors = Object.freeze({
    "red": "indianred",
    "yellow": "orange",
    "blue": "cornflowerblue",
    "green": "green",
    undefined: "transparent",
});

function setMainColor(color) {
    console.log(`setMainColor(${color})`);
    getMainCard().style.border = `solid 1vw ${Colors[color]}`;
}

function addCard(container, type, classes = []) {
    container.appendChild(getCard(type, classes));
}

function getCard(type, classes = []) {
    let typeChunks = type.split("-");
    type = `${typeChunks[typeChunks.length - 2]}-${typeChunks[typeChunks.length - 1]}`;
    let card = document.createElement("img");
    card.src = "/static/uno/cards/" + type + ".svg";
    card.alt = "card";
    card.setAttribute("card-type", type);
    card.classList.add("card");
    classes.forEach((className) => {
        card.classList.add(className);
    });

    card.setAttribute("draggable", "false");

    if (classes.includes("my")) {
        function hold(e) {
            // console.log("Drag start");
            e.preventDefault();
            document.querySelectorAll(".my.card").forEach(card => card.classList.add("no-hover"));

            card.classList.remove("trans");
            card.style.zIndex = "2";

            const Margin = remToPixels(3);

            let
                interval = null,
                sx = 0, sy = 0,
                dx = 0, dy = 0,
                rx = 0, ry = 0;

            let b = card.getBoundingClientRect();

            function drag() {
                sx = clamp(-b.left + Margin, mouseX - b.left - b.width / 2, getWidth() - b.left - b.width - Margin);
                sy = clamp(-b.top + Margin, mouseY - b.top - b.height / 2, getHeight() - b.top - b.height - Margin);

                dx = lerp(dx, sx, 0.05);
                dy = lerp(dy, sy, 0.05);

                rx = lerp(rx, clamp(-45, -450 * (sy - dy) / getWidth(), 45), 0.15);
                ry = lerp(ry, clamp(-45, +450 * (sx - dx) / getHeight(), 45), 0.15);

                card.style.transform = `translate3d(${dx}px, ${dy}px, 0px) rotateX(${rx}deg) rotateY(${ry}deg)`;
            }

            function mouseup(e) {
                clearInterval(interval);

                // console.log("Drag end");
                if (isOverlapping(card, getMainCard())) {
                    // console.log("Overlapping");
                    let cardType = card.getAttribute("card-type");
                    let uuid = uuid4();
                    callbacks[uuid] = () => {
                        let cardIndex = -1;
                        for (let i = 0; i < myDeck.children.length; i++) {
                            if (myDeck.children[i] === card) {
                                cardIndex = i;
                                break;
                            }
                        }
                        myDeck.removeChild(card);
                        myCards.splice(cardIndex, 1);
                        setMainCard(cardType);
                    };
                    timeout(10 * 1000).then(() => delete callbacks[uuid]);
                    room.sendUser(host.id, {"packetType": PacketType.CardOverlap, "uid": uuid, "cardType": cardType});
                } else {
                    // console.log("Not overlapping");
                    // Return the card to the deck
                    // No need to do anything, CSS does that for us
                }

                card.style.removeProperty("transform");
                card.style.removeProperty("z-index");
                card.classList.add("trans");
                document.querySelectorAll(".no-hover").forEach(card => card.classList.remove("no-hover"));

                document.removeEventListener("mouseup", mouseup)
                document.removeEventListener("touchend", mouseup)
            }

            console.log("Set interval");
            interval = setInterval(drag, 5);
            document.addEventListener("mouseup", mouseup, {"passive": true})
            document.addEventListener("touchend", mouseup, {"passive": true})
        }

        card.addEventListener("mousedown", hold);
        card.addEventListener("touchstart", hold);
    }

    card.classList.add("trans");
    return card;
}

const colors = ["red", "yellow", "blue", "green"];
const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const tricks = ["plus", "swap", "stop"];

const startingCards = 7;

class Deck {
    constructor() {
        this.cards = [];

        colors.forEach((color) => {
            tricks.forEach((trick) => {
                this.cards.push(`${color}-${trick}`);
                this.cards.push(`${color}-${trick}`);
            });
            this.cards.push(`wild-0`);
            this.cards.push(`wild-1`);
            this.cards.push(`${color}-0`);
            numbers.forEach((number) => {
                this.cards.push(`${color}-${number}`);
                this.cards.push(`${color}-${number}`);
            });
        });
    }

    pickCard() {
        return this.cards.length > 0 && this.cards.splice(Math.floor(Math.random() * (this.cards.length - 1)), 1)[0];
    }

    insertCard(card) {
        this.cards.push(card);
    }
}

function isOverlapping(element, other) {
    if (!element || !other) return false;

    const a = element.getBoundingClientRect();
    const b = other.getBoundingClientRect();

    return !(a.right < b.left ||
        a.left > b.right ||
        a.bottom < b.top ||
        a.top > b.bottom);
}

window.addEventListener("load", async (event) => {
    console.log(`Loaded game "${document.title}"`);

    playersDiv = document.getElementById("players");
    myDeck = document.getElementById("my-deck");
    mainDeck = document.getElementById("main-deck");
    let colorBar = document.getElementById("color-bar");
    let colors = document.getElementsByClassName("color");

    for (let i = 0; i < colors.length; i++) {
        colors[i].addEventListener("click", (e) => {
            room.sendUser(host.id, {"packetType": PacketType.SelectedColor, "color": colors[i].id});
            colorBar.style.display = "none";
        });
    }

    let takeCardButton = document.getElementById("take-card");

    takeCardButton.addEventListener("click", (e) => {
        room.sendUser(host.id, {"packetType": PacketType.TakeCard});
    });

    // Host variables
    let initialDeck = new Deck();
    let playersCards = {};
    let flowDirection = true;

    function nextPlayer() {
        let currentIndex = playersIDs.findIndex(id => id === userPlaying);
        console.log("index", currentIndex);
        if (flowDirection) {
            if (playersIDs.length > (currentIndex + 1)) {
                userPlaying = playersIDs[currentIndex + 1];
            } else {
                userPlaying = playersIDs[0];
            }
        } else {
            if (currentIndex > 0) {
                userPlaying = playersIDs[currentIndex - 1];
            } else {
                userPlaying = playersIDs[playersIDs.length - 1];
            }
        }
        console.log(`TURNO DI ${userPlaying}`);
    }

    class Player {
        constructor(user) {
            let player = document.createElement("div");
            player.classList.add("player");
            let photo = user["photo"] ? document.createElement("img") : randomPic(user.id);
            if (user["photo"] !== null)
                photo.src = `data:image/png;base64,${user["photo"]}`;
            photo.alt = "profile picture";
            photo.classList.add("player-photo");

            player.appendChild(photo);
            let deck = document.createElement("div");
            deck.classList.add("player-deck");
            player.appendChild(deck);
            this.player = player;
            this.user = user;
            this.deck = deck;

            for (let i = 0; i < startingCards; i++) {
                this.addCard();
            }

            playersDiv.appendChild(player);
            playersIDs.push(user.id);
            players.push(this);
        }

        remove() {
            playersDiv.removeChild(this.player);
            players = players.filter(player => player !== this);
            playersIDs = playersIDs.filter(id => id !== this.user.id);
        }

        addCard() {
            addCard(this.deck, "stroke-back");
        }

        removeCard() {
            if (this.deck.children.length > 0) {
                this.deck.removeChild(this.deck.children[0]);
            }
        }

    }

    function hostInitialization(payload, resetUsers = true) {
        myCards = [];
        while (myDeck != null && myDeck.children.length > 0) {
            myDeck.removeChild(myDeck.children[0]);
        }
        if (resetUsers) {
            users = {};
            players = [];
            payload.data["users"].forEach((user, index) => {
                console.log(user.id, user.name);

                if (user.id !== room.data["decrypted"].i) {
                    user.player = new Player(user);
                    users[user.id] = user;
                } else {
                    playersIDs.push(user.id);
                    me = user;
                }
                if (index === 0) {
                    console.log(`Host: ${user.name}`);
                    host = user;
                }
            });
        }

        userPlaying = players.length > 1 ? players[players.length - 1].user.id : me.id;

        if (host === me) {
            let _mainCard = initialDeck.pickCard();
            while (_mainCard.startsWith("wild")) {
                initialDeck.insertCard(_mainCard);
                _mainCard = initialDeck.pickCard();
            }
            setMainCard(_mainCard);
            players.forEach((player) => {
                playersCards[player.user.id] = [];
                for (let i = 0; i < startingCards; i++) {
                    playersCards[player.user.id].push(initialDeck.pickCard());
                }
                room.sendUser(player.user.id, {
                    packetType: PacketType.GameInit,
                    "cards": playersCards[player.user.id],
                    "mainCard": mainCard,
                    "started": started
                });
            });
            for (let i = 0; i < startingCards; i++) {
                let card = initialDeck.pickCard();
                myCards.push(card);
                addCard(myDeck, card, ["my"]);
            }
        }
    }

    function handleUserAdd(msg) {
        if (msg.user === me.id) {
            myCards.push(msg.card);
            addCard(myDeck, msg.card, ["my"]);
        } else {
            users[msg.user].player.addCard();
            if (host === me) {
                playersCards[msg.user].push(msg.card);
            }
        }
    }

    window._roomcallback = (room, payload) => {
        const Action = window.Action;

        switch (payload.action) {
            case Action.INFO_LIST: {
                hostInitialization(payload);
                break;
            }
            case Action.JOINED: {
                if (host === me && started) {
                    room.sendUser(payload.data.id, {packetType: PacketType.GameInit, "started": started});
                    break;
                }
                payload.data.player = new Player(payload.data);
                users[payload.data.id] = payload.data;
                if (host === me) {
                    if (!playersCards[payload.data.id]) {
                        playersCards[payload.data.id] = [];
                        for (let i = 0; i < startingCards; i++) {
                            playersCards[payload.data.id].push(initialDeck.pickCard());
                        }
                    }
                    room.sendUser(payload.data.id, {
                        packetType: PacketType.GameInit,
                        "cards": playersCards[payload.data.id],
                        "mainCard": mainCard,
                        "started": started
                    });
                }
                break;
            }
            case Action.LEFT: {
                users[payload.data.id].player.remove();
                delete users[payload.data.id];
                if (payload.data.id === host.id) {
                    let hostID = playersIDs[0];
                    if (hostID === me.id) {
                        host = me;
                    } else {
                        host = users[hostID];
                        myCards = [];
                        while (myDeck != null && myDeck.children.length > 0) {
                            myDeck.removeChild(myDeck.children[0]);
                        }
                    }
                    if (host === me) {
                        hostInitialization(payload, false);
                    }
                }
                break;
            }
            case Action.BROADCAST: {
                if (host.id !== payload.data["u"]) {
                    break;
                }
                let msg = payload.data.data.msg;
                if (!msg) break;

                switch (msg.packetType) {
                    case PacketType.UserAddCard: {
                        handleUserAdd(msg);
                        break;
                    }
                }
                break;
            }
            case Action.SEND_USER: {
                let msg = payload.data.data.msg;
                let sender = payload.data["u"];
                if (host === me) {
                    switch (msg.packetType) {
                        case PacketType.CardOverlap: {
                            if (userPlaying === sender) {
                                let cardChunks = msg.cardType.split("-", 2);
                                let mainCardChunks = mainCard.split("-", 2);
                                if (cardChunks[0] === "wild" || cardChunks[0] === mainCardChunks[0] || mainCardChunks[1] === cardChunks[1]) {
                                    nextPlayer();
                                    if (msg.cardType.endsWith("plus")) {
                                        for (let i = 0; i < 2; i++) {
                                            let card = initialDeck.pickCard();
                                            room.broadcast({
                                                "packetType": PacketType.UserAddCard,
                                                "user": userPlaying,
                                                "card": card
                                            });
                                            handleUserAdd({
                                                "packetType": PacketType.UserAddCard,
                                                "user": userPlaying,
                                                "card": card
                                            });
                                        }
                                    } else if (msg.cardType === "wild-0") {
                                        for (let i = 0; i < 4; i++) {
                                            let card = initialDeck.pickCard();
                                            room.broadcast({
                                                "packetType": PacketType.UserAddCard,
                                                "user": userPlaying,
                                                "card": card
                                            });
                                            handleUserAdd({
                                                "packetType": PacketType.UserAddCard,
                                                "user": userPlaying,
                                                "card": card
                                            });
                                        }
                                    } else if (msg.cardType.endsWith("swap")) {
                                        flowDirection = !flowDirection;
                                    } else if (msg.cardType.endsWith("stop")) {
                                        nextPlayer();
                                    }
                                    room.sendUser(sender, {
                                        "packetType": PacketType.CardOverlapSuccessful,
                                        "uid": msg.uid
                                    });
                                    setMainCard(msg.cardType);
                                    setMainColor();
                                    if (sender !== me.id) {
                                        users[sender].player.removeCard();
                                        let cardIndex = playersCards[sender].findIndex(card => card === msg.cardType);
                                        playersCards[sender].splice(cardIndex, 1);
                                    }
                                    players.forEach((player) => {
                                        if (player.user.id !== me.id && player.user.id !== sender) {
                                            room.sendUser(player.user.id, {
                                                "packetType": PacketType.MainCardUpdate,
                                                "cardType": msg.cardType,
                                                "player": sender,
                                                "userPlaying": userPlaying
                                            });
                                        }
                                    });
                                }
                            }
                            break;
                        }
                        case PacketType.SelectedColor: {
                            if (mainCard.startsWith("wild")) {
                                let color = msg.color;

                                players.forEach((player) => {
                                    if (player.user.id !== me.id) {
                                        room.sendUser(player.user.id, {
                                            "packetType": PacketType.MainCardUpdate,
                                            "cardType": `${color}-${mainCard}`,
                                            "player": null,
                                            "userPlaying": userPlaying
                                        });
                                    }
                                });
                                setMainCard(`${color}-${mainCard}`);
                                setMainColor(color);
                            }
                            break;
                        }
                        case PacketType.TakeCard: {
                            break;
                        }
                    }
                }
                if (!host || host.id !== payload.data["u"]) {
                    break;
                }
                switch (msg.packetType) {
                    case PacketType.GameInit: {
                        if (msg.started) {
                            window.close();
                            break;
                        }
                        setMainCard(msg.mainCard);
                        msg.cards.forEach((card) => {
                            if (!card) return;
                            myCards.push(card);
                            addCard(myDeck, card, ["my"]);
                        });
                        break;
                    }
                    case PacketType.GameStarted: {
                        started = true;
                        break;
                    }
                    case PacketType.MainCardUpdate: {
                        setMainCard(msg.cardType);
                        let cardChunks = msg.cardType.split("-");
                        if (cardChunks.length >= 3) {
                            setMainColor(cardChunks[0]);
                        } else {
                            setMainColor();
                        }
                        if (msg.player !== null) {
                            users[msg.player].player.removeCard();
                        }
                        userPlaying = msg.userPlaying;
                        break;
                    }
                    case PacketType.CardOverlapSuccessful: {
                        callbacks[msg.uid]();
                        if (mainCard.startsWith("wild")) {
                            colorBar.style.display = "";
                        }
                        break;
                    }
                }
                break;
            }
        }
        console.log(users);
    };

    loadScript(window._lib_url);
});
