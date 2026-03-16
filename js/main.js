const CONFIG = {
    streamUrl: 'https://nt00.xyz/listen/escape_the_algorithm/radio.mp3',
    apiUrl: 'https://nt00.xyz/api/nowplaying/escape_the_algorithm',
    pollInterval: 10000,
    requestTimeout: 5000,
    defaultArt: 'https://radio.nt00.xyz/android-chrome-512x512.png'
};

let pollTimer = null;
let currentController = null;

const STORAGE_KEYS = {
    shouldPlay: 'nt00_radio_should_play'
};

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

function savePlaybackState(shouldPlay) {
    sessionStorage.setItem(STORAGE_KEYS.shouldPlay, shouldPlay ? '1' : '0');
}

function getSavedPlaybackState() {
    return sessionStorage.getItem(STORAGE_KEYS.shouldPlay) === '1';
}

function updatePlayButton() {
    const { audio, toggle, playLabel, pauseLabel } = getElements();
    if (!audio || !toggle || !playLabel || !pauseLabel) return;

    const isPlaying = !audio.paused;
    playLabel.hidden = isPlaying;
    pauseLabel.hidden = !isPlaying;
    toggle.setAttribute('aria-label', isPlaying ? 'Pause Nt00 Radio' : 'Play Nt00 Radio');
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

async function restorePlaybackState() {
    const { audio } = getElements();
    if (!audio) return;

    if (getSavedPlaybackState()) {
        try {
            await audio.play();
        } catch (error) {
            console.log('Autoplay resume blocked:', error);
        }
    }

    updatePlayButton();
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
                savePlaybackState(true);
            } else {
                audio.pause();
                savePlaybackState(false);
            }
            updatePlayButton();
        } catch (error) {
            console.log('Player error:', error);
        }
    });

    audio.addEventListener('play', () => {
        savePlaybackState(true);
        updatePlayButton();
    });

    audio.addEventListener('pause', () => {
        savePlaybackState(false);
        updatePlayButton();
    });

    audio.addEventListener('ended', () => {
        savePlaybackState(false);
        updatePlayButton();
    });

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

document.addEventListener('DOMContentLoaded', async () => {
    setDefaultPlayerState();
    bindPlayer();
    startPolling();
    await restorePlaybackState();
});

window.addEventListener('beforeunload', stopPolling);
