(function () {
    'use strict';
    // This page must be served from its real HTTP(S) origin. It never sets a fake Referer.
    var TYPE = 'cleanframe-live', VERSION = 1;
    var VIDEOS = ['cb12KmMMDJA', 'rZtTUCxpPuI', 'FEWZjXJ7M0c', 'ArKbAx1K-2U', 'hw4uHyct4vg', 'iaooxPL8G_I'];
    var fragment = /^#nonce=([A-Fa-f0-9]{32,128})$/.exec(window.location.hash);
    var nonce = fragment ? fragment[1] : '';
    var bound = false, parentOrigin = '', opaqueParent = false, closed = false;
    var player = null, ready = false, identityBlocked = false, generation = 0;
    var requestId = 0, videoId = '', apiTimer = null, playerTimer = null, script = null;

    function validNumber(value) {
        return typeof value === 'number' && isFinite(value) && value >= 0 && value <= 2147483647 && Math.floor(value) === value;
    }
    function allowedParent(origin) {
        if (origin === 'null' || origin === 'file://') { return true; }
        try {
            var parsed = new window.URL(origin);
            return (parsed.protocol === 'https:' || parsed.protocol === 'http:') && parsed.origin === origin;
        } catch (ignore) { return false; }
    }
    function ownOrigin() {
        if (window.location.protocol !== 'https:' && window.location.protocol !== 'http:') { return ''; }
        var value = window.location.origin;
        return typeof value === 'string' && /^https?:\/\//.test(value) ? value : '';
    }
    function emit(name, fields) {
        if (!bound) { return; }
        var message = { type: TYPE, version: VERSION, nonce: nonce, event: name, requestId: requestId, videoId: videoId };
        if (fields) {
            if (typeof fields.data === 'number') { message.data = fields.data; }
            if (typeof fields.errorCode === 'number') { message.errorCode = fields.errorCode; }
            if (typeof fields.message === 'string') { message.message = fields.message; }
        }
        try {
            // Opaque file parents require '*'; the exact parent Window, nonce and origin remain pinned.
            window.parent.postMessage(message, opaqueParent ? '*' : parentOrigin);
        } catch (ignore) {}
    }
    function clearTimers() {
        if (apiTimer !== null) { clearTimeout(apiTimer); apiTimer = null; }
        if (playerTimer !== null) { clearTimeout(playerTimer); playerTimer = null; }
    }
    function clearPlayerTimer() {
        if (playerTimer !== null) { clearTimeout(playerTimer); playerTimer = null; }
    }
    function current(token) { return !closed && generation === token; }
    function activeVideo() {
        try {
            var url = player && player.getVideoUrl();
            var match = typeof url === 'string' && /[?&]v=([A-Za-z0-9_-]{11})(?:[&#]|$)/.exec(url);
            return match ? match[1] : '';
        } catch (ignore) { return ''; }
    }
    function matchesVideo(allowUnknown) {
        var active = activeVideo();
        return !!videoId && (active === videoId || (allowUnknown && !active));
    }
    function error(message, code) {
        clearPlayerTimer();
        emit('error', { errorCode: typeof code === 'number' ? code : 0, message: message });
    }
    function watchPlayer(token, preparing) {
        clearPlayerTimer();
        var watchedRequest = requestId;
        playerTimer = setTimeout(function () {
            playerTimer = null;
            if (!current(token) || watchedRequest !== requestId) { return; }
            error(preparing ? 'YouTube no confirmó que el reproductor esté listo.' : 'YouTube no confirmó la reproducción del canal.', 0);
        }, 20000);
    }
    function close(reason) {
        if (closed) { return; }
        closed = true; ready = false; ++generation; clearTimers();
        if (script) { script.onerror = null; }
        window.onYouTubeIframeAPIReady = function () {};
        var previous = player; player = null;
        if (previous) { try { previous.destroy(); } catch (ignore) {} }
        var area = document.getElementById('playerArea');
        while (area && area.firstChild) { area.removeChild(area.firstChild); }
        emit('closed', { message: reason });
    }
    function createPlayer() {
        if (closed || player || !bound || !window.YT || typeof window.YT.Player !== 'function') { return; }
        if (apiTimer !== null) { clearTimeout(apiTimer); apiTimer = null; }
        var origin = ownOrigin();
        if (!origin) { error('El reproductor necesita una página servida desde su origen HTTP(S) real.', 0); return; }
        var token = ++generation;
        watchPlayer(token, true);
        try {
            player = new window.YT.Player('youtubePlayer', {
                width: '100%', height: '100%',
                playerVars: { enablejsapi: 1, controls: 1, origin: origin },
                events: {
                    onReady: function () {
                        if (!current(token) || identityBlocked) { return; }
                        clearPlayerTimer(); ready = true; emit('ready');
                    },
                    onStateChange: function (event) {
                        if (!current(token) || identityBlocked || !matchesVideo(false)) { return; }
                        var value = event && event.data;
                        if (value !== -1 && value !== 0 && value !== 1 && value !== 2 && value !== 3 && value !== 5) { return; }
                        if (value === 0 || value === 1 || value === 2) { clearPlayerTimer(); }
                        emit('state', { data: value });
                    },
                    onError: function (event) {
                        if (!current(token) || identityBlocked) { return; }
                        var code = event && typeof event.data === 'number' ? event.data : 0;
                        if (code === 153) {
                            identityBlocked = true;
                            error('YouTube rechazó la identificación de este reproductor (error 153).', code);
                        } else if (matchesVideo(true)) {
                            error(code === 101 || code === 150 ? 'La transmisión no permite reproducción integrada.' : 'YouTube informó un error de reproducción.', code);
                        }
                    },
                    onAutoplayBlocked: function () {
                        if (!current(token) || identityBlocked || !matchesVideo(true)) { return; }
                        clearPlayerTimer();
                        emit('autoplayblocked', { message: 'YouTube bloqueó el inicio automático. Seleccioná Reproducir.' });
                    }
                }
            });
        } catch (ignore) { error('No se pudo crear el reproductor oficial de YouTube.', 0); }
    }
    function loadAPI() {
        if (!ownOrigin()) { error('Esta página debe servirse desde su origen HTTP(S) real.', 0); return; }
        if (window.YT && typeof window.YT.Player === 'function') { createPlayer(); return; }
        script = document.createElement('script'); script.src = 'https://www.youtube.com/iframe_api'; script.async = true;
        script.onerror = function () {
            if (!closed) { clearTimers(); error('No se pudo conectar con la API oficial de YouTube.', 0); }
        };
        apiTimer = setTimeout(function () {
            apiTimer = null;
            if (!closed && !player) { error('La API de YouTube no respondió.', 0); }
        }, 15000);
        window.onYouTubeIframeAPIReady = function () { if (!closed) { createPlayer(); } };
        document.head.appendChild(script);
    }
    function receive(event) {
        if (closed || !nonce || window.parent === window || event.source !== window.parent) { return; }
        var data = event.data;
        if (!data || typeof data !== 'object' || Array.isArray(data) || data.type !== TYPE || data.version !== VERSION || data.nonce !== nonce) { return; }
        if (!bound) {
            if (data.command !== 'init' || data.requestId !== 0 || data.videoId !== '' || !allowedParent(event.origin)) { return; }
            parentOrigin = event.origin; opaqueParent = parentOrigin === 'null' || parentOrigin === 'file://'; bound = true;
            if (document.hidden) { close('hidden'); } else { loadAPI(); }
            return;
        }
        if (event.origin !== parentOrigin) { return; }
        if (data.command === 'close') { close('parent'); return; }
        if (!validNumber(data.requestId) || VIDEOS.indexOf(data.videoId) < 0 || identityBlocked) { return; }
        if (data.command === 'load') {
            if (!ready || !player || data.requestId <= requestId) { return; }
            requestId = data.requestId; videoId = data.videoId;
            watchPlayer(generation, false);
            try { player.loadVideoById({ videoId: videoId }); }
            catch (ignore) { error('YouTube no aceptó el canal solicitado.', 0); }
            return;
        }
        if (!ready || !player || data.requestId !== requestId || data.videoId !== videoId) { return; }
        try {
            if (data.command === 'play') { player.playVideo(); watchPlayer(generation, false); }
            else if (data.command === 'pause') { player.pauseVideo(); }
        } catch (ignore) { error('YouTube no aceptó el control de reproducción.', 0); }
    }
    window.addEventListener('message', receive);
    document.addEventListener('visibilitychange', function () { if (document.hidden) { close('hidden'); } });
    window.addEventListener('pagehide', function () { close('pagehide'); });
    window.addEventListener('beforeunload', function () { close('unload'); });
}());
