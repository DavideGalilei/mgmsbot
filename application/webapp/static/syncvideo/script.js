function loadScript(src) {
    let tag = document.createElement('script');
    tag.src = src;
    let firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
}
loadScript("https://www.youtube.com/iframe_api");

function onYouTubeIframeAPIReady() {
    window.playVidYT = function(videoId, cb, url, startSeconds){
        window.notPlayingAnything = false;
        if(typeof videoId !== 'string') return;
        let player = new YT.Player('pro_player_de_fifa', {
            height: 'width: 100%;',
            width: 'height: calc(100% - 2px)',
            videoId,
            events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange
            }
        });
        window._ytdebugplayer = player;
        function onPlayerReady(event) {
            player.seekTo(startSeconds);
            clearLatesync();
            window.lateSync = setInterval(()=>cb("latesync", url, event.target.getCurrentTime()), 1000);
            window.controls = [player, ()=>player.stopVideo(), ()=>player.playVideo(), ()=>player.pauseVideo(), (time)=>player.seekTo(time)];
            event.target.playVideo();
            document.querySelector('#songname').innerText = event.target.getVideoData().title;
        }
        function onPlayerStateChange(event) {
            switch (event.data) {
                case YT.PlayerState.PLAYING:
                    clearLatesync();
                    window.lateSync = setInterval(()=>cb("latesync", url, event.target.getCurrentTime()), 1000);
                    window.currPaused = false;
                    cb("unpaused", url, event.target.getCurrentTime());
                    break;
                case YT.PlayerState.PAUSED:
                    window.currPaused = true;
                    clearLatesync();
                    cb("paused", url, event.target.getCurrentTime());
                    break;
            }
         }
    }
}
function resyncNumberUsers() {
    document.querySelector("#usrcount").innerText = document.querySelector("#online_users").childNodes.length-1;
}
function audioOK() {
    document.querySelector("#sendgo").disabled = false;
    resetPlayer();
    loadScript(window._lib_url);
    window._roomcallback = (room, payload) => {
        switch (payload.action) {
            case Action.INFO_LIST: {
                payload.data["users"].forEach((user) => {
                    addUser(user.name, user.photo, user.id);
                })
                resyncNumberUsers();
                break;
            }
            case Action.JOINED: {
                addUser(payload.data.name, payload.data.photo, payload.data.id);
                resyncNumberUsers();
                break;
            }
            case Action.LEFT: {
                delUser(payload.data.id);
                resyncNumberUsers();
                break;
            }
            case Action.BROADCAST: {
                console.log(payload)
                if(!payload.data           || typeof payload.data           !== "object") return console.log("check not passed 01")
                if(!payload.data.data      || typeof payload.data.data      !== "object") return console.log("check not passed 0")
                if(!payload.data.data.time || typeof payload.data.data.time !== "number") return console.log("check not passed 1");
                if(!payload.data.data.url  || typeof payload.data.data.url  !== "string") return console.log("check not passed 2");
                if(!payload.data.data.type || typeof payload.data.data.type !== "string") return console.log("check not passed 3");
                switch (payload.data.data.type) {
                    case "paused":
                        if(!window.currPaused) {
                            resumeOrSwitch(payload.data.data.url, payload.data.data.time);
                            window.controls[3]();
                        }
                        break;
                    case "unpaused":
                        if(window.currPaused){
                            resumeOrSwitch(payload.data.data.url, payload.data.data.time);
                            window.controls[2]();
                        }
                        break;
                    case "latesync":
                        if(window.notPlayingAnything){
                            console.log("jumping")
                            resumeOrSwitch(payload.data.data.url, payload.data.data.time);
                        }
                        break;
                }
            }
        }
    };
    window.handlePlay = function(url, goto=0) {
        let nop = ()=>{};
        window.controls = [nop, nop, nop, nop, nop];
        resetPlayer();
        if(new RegExp("^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$").test(url)){
            let videoId = url.split("=")[1];
            if(!videoId) videoId = url.split("/")[3];
            window.currURL = url;
            let cb = function(type, url, time) {
                console.log(type, url, time);
                window.room.broadcast({
                    type,
                    url,
                    time
                })
            }
            window.playVidYT(videoId, cb, url, goto);
        }
    }
    document.querySelector("#sendgo").onclick = ()=>handlePlay(document.querySelector("#vidurl").value);
}
document.querySelector("#sendgo").disabled = true;
document.querySelector("#srconnect").onclick = audioOK;
function addUser(name, image, id) {
    console.log(name, image, id);
    document.querySelector("#online_users").innerHTML += `<div id="tgid${id}" class="flex justify-content-start align-items-center" style="margin-top: 20px;margin-right: 5px;margin-bottom: 5px;margin-left: 5px;height: 50px;background: rgba(255,255,255,0.11);border-radius: 5px;padding: 0px;">
        <img src="data:image/png;base64,${image}" style="border-radius: 100%;max-width: 30px;margin: 5px;">
        <div class="flex justify-content-center align-items-center" style="width: 100%;height: 6vh;">
            <p style="margin: 0px;color: rgb(214,214,214);">${name.replaceAll("<", "&gt;").replaceAll(">", "&lt;")}</p>
        </div>
    </div>`;
}
function delUser(id) {
    document.querySelector(`#tgid${id}`).outerHTML = "";
}
function clearLatesync() {
    if(window.lateSync !== undefined) {
        clearInterval(window.lateSync);
        window.lateSync = undefined;
    }
}
function resetPlayer() {
    clearLatesync();
    window.notPlayingAnything = true;
    document.querySelector("#pro_player_de_fifa").outerHTML = '<div id="pro_player_de_fifa" class="justify-content-md-start align-items-md-center" style="display: flex; background-color: #2e2e2e; color: white; align-items: center !important; justify-content: center !important;">Enter a URL</div>';
}
function resumeOrSwitch(url, time) {
    if(!window.currURL || url !== window.currURL) {
        window.handlePlay(url, time);
    } else {
        window.controls[4](time);
    }
}