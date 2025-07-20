class SoundclouderApp {
    constructor() {
        this.currentPlaylist = null;
        this.initializeEventListeners();
        this.handleURLParameters();
    }

    // Helper function to create SVG icons
    createIcon(type) {
        const icons = {
            download: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7,10 12,15 17,10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>`,
            success: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20,6 9,17 4,12"/>
            </svg>`,
            error: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>`,
            folder: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>`
        };
        return icons[type] || '';
    }

    initializeEventListeners() {
        // Fetch playlist button
        document.getElementById('fetchBtn').addEventListener('click', () => {
            this.fetchPlaylist();
        });

        // Enter key on input
        document.getElementById('playlistUrl').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.fetchPlaylist();
            }
        });

        // Download All button
        document.getElementById('downloadAllBtn').addEventListener('click', () => {
            this.downloadAll();
        });
    }

    showError(message) {
        const errorDiv = document.getElementById('errorMessage');
        errorDiv.textContent = message;
        errorDiv.classList.remove('hidden');
        
        // Hide other sections
        document.getElementById('playlistInfo').classList.add('hidden');
    }

    hideError() {
        document.getElementById('errorMessage').classList.add('hidden');
    }

    showLoading(buttonId, show = true) {
        const button = document.getElementById(buttonId);
        const spinner = button.querySelector('.spinner');
        const text = button.querySelector('.btn-text');
        
        if (show) {
            spinner.classList.remove('hidden');
            text.style.opacity = '0.7';
            button.disabled = true;
        } else {
            spinner.classList.add('hidden');
            text.style.opacity = '1';
            button.disabled = false;
        }
    }

    formatDuration(seconds) {
        if (!seconds) return '';
        // Round to nearest second
        const roundedSeconds = Math.round(seconds);
        const minutes = Math.floor(roundedSeconds / 60);
        const remainingSeconds = roundedSeconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    async fetchPlaylist() {
        const urlInput = document.getElementById('playlistUrl');
        const url = urlInput.value.trim();

        if (!url) {
            this.showError('Please enter a SoundCloud playlist URL');
            return;
        }

        if (!url.includes('soundcloud.com')) {
            this.showError('Please enter a valid SoundCloud URL');
            return;
        }

        this.hideError();
        this.showLoading('fetchBtn');

        try {
            const response = await fetch('/api/playlist-info', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch playlist');
            }

            this.currentPlaylist = data;
            this.displayPlaylist(data);

        } catch (error) {
            console.error('Error fetching playlist:', error);
            this.showError(error.message || 'Failed to fetch playlist information');
        } finally {
            this.showLoading('fetchBtn', false);
        }
    }

    displayPlaylist(playlist) {
        // Hide input section and header for cleaner download page (navigation already removed)
        document.querySelector('.input-section').classList.add('hidden');
        const navigation = document.querySelector('.navigation');
        if (navigation) navigation.classList.add('hidden');
        document.querySelector('.header').classList.add('hidden');
        
        // Show playlist info section
        document.getElementById('playlistInfo').classList.remove('hidden');

        // Update playlist header
        document.getElementById('playlistTitle').textContent = playlist.title;
        document.getElementById('playlistUploader').textContent = `by ${playlist.uploader}`;

        // Update download button text to show song count and playlist title
        const downloadBtn = document.getElementById('downloadAllBtn');
        const btnText = downloadBtn.querySelector('.btn-text');
        const trackCount = playlist.tracks.length;
        btnText.innerHTML = `
            <svg class="btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
            Download all ${trackCount} songs to folder titled: ${playlist.title}
        `;

        // Clear and populate tracks list
        const tracksList = document.getElementById('tracksList');
        tracksList.innerHTML = '';

        playlist.tracks.forEach((track, index) => {
            const trackItem = this.createTrackItem(track, index);
            tracksList.appendChild(trackItem);
        });

        // Add "CNVRT Another Playlist" button at the bottom
        const cnvrtAnotherBtn = document.createElement('div');
        cnvrtAnotherBtn.className = 'cnvrt-another-container';
        cnvrtAnotherBtn.innerHTML = `
            <button class="cnvrt-another-btn" id="cnvrtAnotherBtn">
                <span class="btn-text">CNVRT Another Playlist</span>
            </button>
        `;
        tracksList.appendChild(cnvrtAnotherBtn);

        // Add event listener for the new button
        document.getElementById('cnvrtAnotherBtn').addEventListener('click', () => {
            this.resetToInputForm();
        });
    }

    createTrackItem(track, index) {
        const trackItem = document.createElement('div');
        trackItem.className = 'track-item';
        trackItem.dataset.trackIndex = index;

        // Track number
        const trackNumber = document.createElement('div');
        trackNumber.className = 'track-number';
        trackNumber.textContent = (index + 1).toString();

        // Track info container
        const trackInfo = document.createElement('div');
        trackInfo.className = 'track-info';

        // Track title (clickable link)
        const trackTitle = document.createElement('a');
        trackTitle.className = 'track-title';
        trackTitle.href = track.url;
        trackTitle.target = '_blank';
        trackTitle.textContent = track.title;

        // Track duration and BPM
        const trackDuration = document.createElement('div');
        trackDuration.className = 'track-duration';
        const durationText = this.formatDuration(track.duration);
        const bpmText = track.bpm ? `${track.bpm} BPM` : 'N/A BPM';
        trackDuration.textContent = `${durationText} • ${bpmText}`;

        // Add title and duration to info container
        trackInfo.appendChild(trackTitle);
        trackInfo.appendChild(trackDuration);

        // Download button (just arrow icon)
        const trackActions = document.createElement('div');
        trackActions.className = 'track-actions';

        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'download-btn';
        downloadBtn.innerHTML = `
            <span class="btn-icon">${this.createIcon('download')}</span>
            <div class="spinner hidden"></div>
        `;
        downloadBtn.addEventListener('click', () => this.downloadTrack(track, downloadBtn));

        trackActions.appendChild(downloadBtn);

        // Assemble the track item
        trackItem.appendChild(trackNumber);
        trackItem.appendChild(trackInfo);
        trackItem.appendChild(trackActions);

        return trackItem;
    }

    async downloadTrack(track, button) {
        const spinner = button.querySelector('.spinner');
        const icon = button.querySelector('.btn-icon');
        
        // Show loading state
        spinner.classList.remove('hidden');
        icon.style.opacity = '0.7';
        button.disabled = true;

        try {
            // Create a form to submit the download request
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = '/api/download-track';
            form.style.display = 'none';

            const urlInput = document.createElement('input');
            urlInput.type = 'hidden';
            urlInput.name = 'url';
            urlInput.value = track.url;

            const titleInput = document.createElement('input');
            titleInput.type = 'hidden';
            titleInput.name = 'title';
            titleInput.value = track.title;

            form.appendChild(urlInput);
            form.appendChild(titleInput);
            document.body.appendChild(form);

            // Submit the form to trigger download
            form.submit();

            // Clean up
            document.body.removeChild(form);

            // Update button state
            icon.innerHTML = this.createIcon('success');
            button.style.background = '#10b981';
            
            // Reset button after a few seconds
            setTimeout(() => {
                icon.innerHTML = this.createIcon('download');
                button.style.background = '';
                button.disabled = false;
                spinner.classList.add('hidden');
                icon.style.opacity = '1';
            }, 3000);

        } catch (error) {
            console.error('Download error:', error);
            icon.innerHTML = this.createIcon('error');
            button.style.background = '#ef4444';
            
            // Reset button after 3 seconds
            setTimeout(() => {
                icon.innerHTML = this.createIcon('download');
                button.style.background = '';
                button.disabled = false;
                spinner.classList.add('hidden');
                icon.style.opacity = '1';
            }, 3000);
        }
    }

    async downloadAll() {
        if (!this.currentPlaylist || !this.currentPlaylist.tracks) {
            this.showError('No playlist loaded');
            return;
        }

        const button = document.getElementById('downloadAllBtn');
        const spinner = button.querySelector('.spinner');
        const text = button.querySelector('.btn-text');
        
        try {
            // Show loading state
            spinner.classList.remove('hidden');
            text.style.opacity = '0.7';
            button.disabled = true;
            text.innerHTML = `${this.createIcon('folder')} Starting Download...`;

            const response = await fetch('/api/download-all', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    tracks: this.currentPlaylist.tracks,
                    playlistTitle: this.currentPlaylist.title
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Read the stream for progress updates
            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            let receivedLength = 0;
            let chunks = [];

            while (true) {
                const { done, value } = await reader.read();

                if (done) break;

                chunks.push(value);
                receivedLength += value.length;

                // Decode the latest chunk
                const chunk = decoder.decode(value, { stream: true });
                
                // Update button text with latest progress
                const lines = chunk.split('\n').filter(line => line.trim());
                if (lines.length > 0) {
                    const lastLine = lines[lines.length - 1];
                    if (lastLine.includes('Downloading')) {
                        text.innerHTML = `${this.createIcon('folder')} ${lastLine.split(': ')[1] || 'Downloading...'}`;
                    } else if (lastLine.includes('complete')) {
                        text.innerHTML = `${this.createIcon('success')} Download Complete!`;
                    }
                }
            }

            // Success state
            button.style.background = '#10b981';
            text.innerHTML = `${this.createIcon('success')} All Downloads Complete!`;
            
            // Reset button after 5 seconds
            setTimeout(() => {
                text.innerHTML = `${this.createIcon('folder')} Download All to Folder`;
                button.style.background = '';
                button.disabled = false;
                spinner.classList.add('hidden');
                text.style.opacity = '1';
            }, 5000);

        } catch (error) {
            console.error('Download all error:', error);
            text.innerHTML = `${this.createIcon('error')} Download Failed`;
            button.style.background = '#ef4444';
            
            // Reset button after 3 seconds
            setTimeout(() => {
                text.innerHTML = `${this.createIcon('folder')} Download All to Folder`;
                button.style.background = '';
                button.disabled = false;
                spinner.classList.add('hidden');
                text.style.opacity = '1';
            }, 3000);
        }
    }

    handleURLParameters() {
        // Check for URL parameter from landing page
        const urlParams = new URLSearchParams(window.location.search);
        const playlistUrl = urlParams.get('url');
        
        if (playlistUrl) {
            // Auto-populate the input field
            const urlInput = document.getElementById('playlistUrl');
            urlInput.value = decodeURIComponent(playlistUrl);
            
            // Auto-fetch the playlist after a short delay
            setTimeout(() => {
                this.fetchPlaylist();
            }, 500);
        }
    }

    resetToInputForm() {
        // Hide playlist info
        document.getElementById('playlistInfo').classList.add('hidden');
        
        // Show input section and header again (navigation doesn't exist)
        document.querySelector('.input-section').classList.remove('hidden');
        const navigation = document.querySelector('.navigation');
        if (navigation) navigation.classList.remove('hidden');
        document.querySelector('.header').classList.remove('hidden');
        
        // Clear the input field
        document.getElementById('playlistUrl').value = '';
        
        // Focus on the input field
        document.getElementById('playlistUrl').focus();
        
        // Reset current playlist
        this.currentPlaylist = null;
    }


}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SoundclouderApp();
}); 