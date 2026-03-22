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
        art: document.getElementById('ntPlayerArt')
    };
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

    // Fix: properly hide/show LIVE badge
    liveBadge.hidden = true;  // Always hide first
    
    const isLive = data && data.live && data.live.is_live === true;
    if (isLive) {
        liveBadge.hidden = false;
    }

    art.src = CONFIG.defaultArt;
    renderHistory(data);  // history function
}

function renderHistory(data) {
    const container = document.getElementById('ntHistoryList');
    if (!container) return;

    container.innerHTML = '';

    const history = (data && Array.isArray(data.song_history))
        ? data.song_history.slice(0, 5)
        : [];

    if (!history.length) {
        const li = document.createElement('li');
        li.className = 'nt-history-item-header nt-history-item--empty';
        li.textContent = 'No recent tracks.';
        container.appendChild(li);
        return;
    }

    history.forEach(entry => {
        const song = entry.song || {};
        const title = song.title || 'Unknown title';
        const artist = song.artist || 'Unknown artist';

        let started = '';
        if (entry.played_at) {
            const d = new Date(entry.played_at * 1000);
            const h = String(d.getHours()).padStart(2, '0');
            const m = String(d.getMinutes()).padStart(2, '0');
            started = `${h}:${m}`;
        }

        const li = document.createElement('li');
        li.className = 'nt-history-item-header';

        li.innerHTML = `
            <span class="nt-history-item-time-header">${started}</span>
            <span class="nt-history-item-main-header">
                <span class="nt-history-item-title-header">${title}</span>
                <span class="nt-history-item-artist-header">${artist}</span>
            </span>
        `;

        container.appendChild(li);
    });
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

window.addEventListener('pagehide', stopPolling);
