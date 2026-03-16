const CONFIG = {
    apiUrl: 'https://nt00.xyz/api/nowplaying/escape_the_algorithm',
    pollInterval: 10000,
    requestTimeout: 5000
};

let pollTimer = null;
let currentController = null;

function getNowPlayingElements() {
    return {
        songTitle: document.querySelector('.song-title'),
        artistName: document.querySelector('.artist-name')
    };
}

function updateNowPlayingUI(title, artist) {
    const { songTitle, artistName } = getNowPlayingElements();
    if (!songTitle || !artistName) return;

    songTitle.textContent = title;
    artistName.textContent = artist;
}

async function updateNowPlaying() {
    const { songTitle, artistName } = getNowPlayingElements();
    if (!songTitle || !artistName) return;

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
        const song = data?.now_playing?.song;

        updateNowPlayingUI(
            song?.title || 'Unknown Title',
            song?.artist || 'Unknown Artist'
        );
    } catch (error) {
        if (error.name !== 'AbortError') {
            console.log('Could not fetch now playing:', error);
            updateNowPlayingUI('Now Playing', 'Loading stream...');
        }
    } finally {
        clearTimeout(timeoutId);
        currentController = null;
    }
}

function startNowPlayingPolling() {
    stopNowPlayingPolling();
    updateNowPlaying();
    pollTimer = setInterval(() => {
        if (!document.hidden) {
            updateNowPlaying();
        }
    }, CONFIG.pollInterval);
}

function stopNowPlayingPolling() {
    if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
    }

    if (currentController) {
        currentController.abort();
        currentController = null;
    }
}

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        if (currentController) currentController.abort();
    } else {
        updateNowPlaying();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    startNowPlayingPolling();
});

window.addEventListener('beforeunload', stopNowPlayingPolling);
