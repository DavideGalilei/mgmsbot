window.addEventListener("load", (event) => {
    console.log(`Loaded game "${document.title}"`);

    const button = document.getElementById("send");
    const input = document.getElementById("input");
    const messages = document.getElementById("messages");

    function addMessage(text, sent) {
        sent = sent || false;
        const p = document.createElement("p");
        const t = document.createTextNode(text);
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
        addMessage(JSON.stringify(payload));
    };
});
