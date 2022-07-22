(async function () {
    const Action = window.Action = Object.freeze({
        NO_OP: 1,
        RECEIVE: 2,
        SEND_USER: 3,
        BROADCAST: 4,
        KICK: 5,
        INFO_LIST: 6,
        JOINED: 7,
        LEFT: 8,
    });

    const actionValueMap = window.ActionString = Object.assign({}, ...Object.entries(Action).map(([a, b]) => ({[b]: a})));

    function makePayload(payload) {
        console.log("sent:", payload)
        return JSON.stringify({"a": payload.action, "d": payload.data});
    }

    function decodePayload(payload) {
        const jsoned = JSON.parse(payload);
        console.log("received:", jsoned);

        return {
            action: jsoned["a"],
            data: jsoned["d"],
        }
    }

    const l = window.location;

    let data = await (await fetch(`${l.href}`, {
        credentials: "include",
        method: "POST",
    })).json();

    let p = (l.protocol === "https:") ? "wss" : "ws";
    let connection = new WebSocket(`${p}://${l.host}/ws${l.pathname}${l.search}`);

    connection.addEventListener("message", async (event) => {
        if (window.room.listenCallback !== null) {
            window.room.listenCallback(window.room, decodePayload(event.data));
        }
    });

    window.room = {
        connection,
        makePayload,
        decodePayload,
        sendUser: (uid, msg) => connection.send(makePayload({
            action: Action.SEND_USER,
            data: {i: uid, msg: msg},
        })),
        broadcast: (msg) => connection.send(makePayload({
            action: Action.BROADCAST,
            data: msg,
        })),
        listenCallback: window._roomcallback??null
    };

    console.log(data);
    window.room.data = data;

    connection.addEventListener("close", (e) => console.log("Websocket closed."));
})()
