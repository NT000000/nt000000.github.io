const CONFIG = {
    streamUrl: 'https://nt00.xyz/listen/escape_the_algorithm/radio.mp3',
    apiUrl: 'https://nt00.xyz/api/nowplaying/escape_the_algorithm',
    pollInterval: 10000,
    requestTimeout: 5000,
    defaultArt: 'https://radio.nt00.xyz/android-chrome-512x512.png'
};

let pollTimer = null;
let currentController = null;

function getElements() {
    return {
        audio: document.getElementById('ntRadioAudio'),
        toggle: document.getElementById('ntPlayerToggle'),
        playLabel: document.querySelector('.nt-player-label--play'),
        pauseLabel: document.querySelector('.nt-player-label--pause'),
        liveBadge: document.getElementById('ntLiveBadge'),
        track: document.getElementById('ntPlayerTrack'),
        artist: document.getElementById('ntPlayerArtist'),
        art: document.getElementById('ntPlayerArt')
    };
}

function updatePlayerFromApi(data) {
    const { liveBadge, art } = getElements();
    if (!liveBadge || !art) return;

    const isLive = data && data.live && data.live.is_live === true;

    liveBadge.hidden = true;

    if (isLive) {
        liveBadge.hidden = false;
    }

    art.src = CONFIG.defaultArt;
}

function setDefaultPlayerState() {
    const { liveBadge, art } = getElements();

    if (liveBadge) liveBadge.hidden = true;
    if (art) art.src = CONFIG.defaultArt;
}

function updatePlayerFromApi(data) {
    const { liveBadge, art } = getElements();
    if (!liveBadge || !art) return;

    const isLive = data && data.live && data.live.is_live === true;

    liveBadge.hidden = true;

    if (isLive) {
        liveBadge.hidden = false;
    }

    art.src = CONFIG.defaultArt;
}

async function updateNowPlaying() {
    if (currentController) {
        currentController.abort();
    }

    currentController = new AbortController();
    const timeoutId = setTimeout(() => currentController.abort(), CONFIG.requestTimeout);

    try {
        const response = await fetch(CONFIG.apiUrl, {
            signal: currentController.signal,
            cache: 'no-store'
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        updatePlayerFromApi(data);
    } catch (error) {
        if (error.name !== 'AbortError') {
            console.log('Could not fetch now playing:', error);
            setDefaultPlayerState();
        }
    } finally {
        clearTimeout(timeoutId);
        currentController = null;
    }
}

function stopPolling() {
    if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
    }

    if (currentController) {
        currentController.abort();
        currentController = null;
    }
}

function startPolling() {
    stopPolling();
    updateNowPlaying();

    pollTimer = setInterval(() => {
        if (!document.hidden) {
            updateNowPlaying();
        }
    }, CONFIG.pollInterval);
}

function bindPlayer() {
    const { audio, toggle, art } = getElements();
    if (!audio || !toggle) return;

    audio.src = CONFIG.streamUrl;
    if (art) art.src = CONFIG.defaultArt;

    toggle.addEventListener('click', async () => {
        try {
            if (audio.paused) {
                await audio.play();
            } else {
                audio.pause();
            }
            updatePlayButton();
        } catch (error) {
            console.log('Player error:', error);
        }
    });

    audio.addEventListener('play', updatePlayButton);
    audio.addEventListener('pause', updatePlayButton);
    audio.addEventListener('ended', updatePlayButton);
    audio.addEventListener('error', updatePlayButton);

    updatePlayButton();
}

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        if (currentController) currentController.abort();
    } else {
        updateNowPlaying();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    setDefaultPlayerState();
    bindPlayer();
    startPolling();
});

window.addEventListener('beforeunload', stopPolling);
