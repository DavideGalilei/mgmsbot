(async function () {
    const makeUint16 = (n) => [n & 0xFF, n >> 8 & 0xFF];
    const getUint16 = (arr) => arr[0] | arr[1] << 8;

    const makeUint32 = (n) => [n & 0xFF, n >> 8 & 0xFF, n >> 16 & 0xFF, n >> 24 & 0xFF];
    const getUint32 = (arr) => arr[0] | arr[1] << 8 | arr[2] << 16 | arr[3] << 24;

    function insertIntoBuffer(buffer, arr, offset) {
        offset = offset || 0;
        for (let i = 0; i < arr.length; i++) {
            if (typeof arr[i] === "string")
                buffer[offset + i] = arr[i].charCodeAt(0);
            else
                buffer[offset + i] = arr[i];
        }
    }

    function strToBuf(str) {
        const result = new Uint8Array(str.length);
        for (let i = 0; i < str.length; i++) {
            result[i] = str[i].charCodeAt(0);
        }
        return result;
    }

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
        const action = makeUint16(payload.action);
        const jsoned = JSON.stringify(payload.data || {});
        const length = makeUint32(jsoned.length);

        let buffer = new Uint8Array(2 + 4 + jsoned.length);
        insertIntoBuffer(buffer, action);
        insertIntoBuffer(buffer, length, 2);
        insertIntoBuffer(buffer, jsoned, 2 + 4);

        console.log("sent:", String.fromCharCode.apply(null, buffer));
        return buffer;
    }

    function decodePayload(payload) {
        console.log("received:", payload);
        const action = getUint16(strToBuf(payload.slice(0, 2)));
        const length = getUint32(strToBuf(payload.slice(2, 6)));
        const data = JSON.parse(payload.slice(6, 6 + length));

        return {
            action: action,
            data: data,
        }
    }

    const l = window.location;

    let p = (l.protocol === "https:") ? "wss" : "ws";
    let connection = new WebSocket(`${p}://${l.host}/ws${l.pathname}${l.search}`);

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

    let data = await (await fetch(`${l.href}`, {
        credentials: "include",
        method: "POST",
    })).json();

    console.log(data);
    window.room.data = data;

    connection.addEventListener("message", async (event) => {
        if (window.room.listenCallback !== null) {
            window.room.listenCallback(window.room, decodePayload(await event.data.text()));
        }
    });

    connection.addEventListener("close", (e) => console.log("Websocket closed."));
})()
