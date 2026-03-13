const CONFIG = {
    // Your AzuraCast API endpoint for now playing data
    apiUrl: 'https://nt00.xyz/api/nowplaying/escape_the_algorithm',
    
    // Your stream URL for the audio player
    streamUrl: 'https://nt00.xyz/listen/escape_the_algorithm/radio.mp3'
};

// Update now playing information
async function updateNowPlaying() {
    try {
        const response = await fetch(CONFIG.apiUrl);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        const songTitle = document.querySelector('.song-title');
        const artistName = document.querySelector('.artist-name');
        
        if (data.now_playing && data.now_playing.song) {
            songTitle.textContent = data.now_playing.song.title || 'Unknown Title';
            artistName.textContent = data.now_playing.song.artist || 'Unknown Artist';
        }
    } catch (error) {
        console.log('Could not fetch now playing:', error);
        document.querySelector('.song-title').textContent = 'Now Playing';
        document.querySelector('.artist-name').textContent = 'Loading stream...';
    }
}

// Update every 10 seconds
updateNowPlaying();
setInterval(updateNowPlaying, 10000);
