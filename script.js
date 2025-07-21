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
            info: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 16v-4"/>
                <path d="M12 8h.01"/>
            </svg>`,
            loading: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="loading-icon">
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
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

        // Custom Path button
        document.getElementById('customPathBtn').addEventListener('click', () => {
            this.downloadWithCustomPath();
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

            // Check if response is ok
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Check if response is JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Server returned non-JSON response');
            }

            const data = await response.json();

            this.currentPlaylist = data;
            this.displayPlaylist(data);

        } catch (error) {
            console.error('Error fetching playlist:', error);
            if (error.name === 'SyntaxError') {
                this.showError('Server returned invalid response. Please try again.');
            } else {
                this.showError(error.message || 'Failed to fetch playlist information');
            }
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

        // Track duration only (BPM not available from SoundCloud)
        const trackDuration = document.createElement('div');
        trackDuration.className = 'track-duration';
        const durationText = this.formatDuration(track.duration);
        trackDuration.textContent = durationText;

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
        
        // Show loading state - hide download icon, show loading icon
        icon.innerHTML = this.createIcon('loading');
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

            // Update button state to green with checkmark
            icon.innerHTML = this.createIcon('success');
            button.style.background = '#10b981';
            button.style.color = 'white';
            button.disabled = false;

        } catch (error) {
            console.error('Download error:', error);
            icon.innerHTML = this.createIcon('error');
            button.style.background = '#ef4444';
            button.style.color = 'white';
            
            // Reset button after 3 seconds
            setTimeout(() => {
                icon.innerHTML = this.createIcon('download');
                button.style.background = '';
                button.style.color = '';
                button.disabled = false;
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
            // Show loading state - replace folder icon with loading icon
            button.disabled = true;
            text.innerHTML = `${this.createIcon('loading')} Starting Download...`;

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
            let problemTracks = [];

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
                        const trackInfo = lastLine.split(': ')[1] || 'Downloading...';
                        text.innerHTML = `${this.createIcon('loading')} ${trackInfo}`;
                        
                        // Extract track number and update individual button
                        const trackMatch = lastLine.match(/Downloading (\d+)\/(\d+): (.+)/);
                        if (trackMatch) {
                            const trackIndex = parseInt(trackMatch[1]) - 1; // Convert to 0-based index
                            this.updateTrackButtonToLoading(trackIndex);
                        }
                    } else if (lastLine.includes('complete')) {
                        text.innerHTML = `${this.createIcon('success')} Downloaded`;
                    } else if (lastLine.startsWith('ISSUES_DETECTED:')) {
                        // Parse the issues data
                        const issuesData = lastLine.replace('ISSUES_DETECTED:', '');
                        try {
                            problemTracks = JSON.parse(issuesData);
                        } catch (e) {
                            console.error('Failed to parse issues data:', e);
                        }
                    }
                }
                
                // Check for individual track completion
                chunk.split('\n').forEach(line => {
                    if (line.includes('Download completed for:')) {
                        const trackTitle = line.split('Download completed for: ')[1];
                        if (trackTitle) {
                            // Check if it's a preview or full download
                            const isPreview = trackTitle.includes('(preview only)');
                            const cleanTitle = trackTitle.replace(' (preview only)', '').trim();
                            this.updateTrackButtonToComplete(cleanTitle, isPreview);
                        }
                    } else if (line.includes('Download failed for:')) {
                        const trackTitle = line.split('Download failed for: ')[1];
                        if (trackTitle) {
                            this.updateTrackButtonToFailed(trackTitle.trim(), 'The following track could not be downloaded at full quality due to content restrictions, authentication, or privacy of the track.');
                        }
                    }
                });
            }

            // Success state - green with checkmark
            button.style.background = '#10b981';
            button.style.color = 'white';
            text.innerHTML = `${this.createIcon('success')} Downloaded`;
            button.disabled = false;

            // Issues are now handled per-track with hover popups

        } catch (error) {
            console.error('Download all error:', error);
            text.innerHTML = `${this.createIcon('error')} Download Failed`;
            button.style.background = '#ef4444';
            button.style.color = 'white';
            
            // Reset button after 3 seconds
            setTimeout(() => {
                text.innerHTML = `${this.createIcon('folder')} Download All to Folder`;
                button.style.background = '';
                button.style.color = '';
                button.disabled = false;
            }, 3000);
        }
    }

    async downloadWithCustomPath() {
        if (!this.currentPlaylist || !this.currentPlaylist.tracks) {
            this.showError('No playlist loaded');
            return;
        }

        // Prompt user for custom path and name
        const customPath = prompt('Enter custom folder path (leave empty for Downloads folder):', '');
        if (customPath === null) return; // User cancelled

        const customName = prompt('Enter custom folder name:', this.currentPlaylist.title);
        if (customName === null) return; // User cancelled

        const finalFolderName = customName.trim() || this.currentPlaylist.title;

        const button = document.getElementById('customPathBtn');
        const text = button.querySelector('.btn-text');
        
        try {
            // Show loading state
            button.disabled = true;
            text.innerHTML = `${this.createIcon('loading')} Starting Custom Download...`;

            const response = await fetch('/api/download-custom', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    tracks: this.currentPlaylist.tracks,
                    playlistTitle: finalFolderName,
                    customPath: customPath.trim()
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
            let problemTracks = [];

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
                        const trackInfo = lastLine.split(': ')[1] || 'Downloading...';
                        text.innerHTML = `${this.createIcon('loading')} ${trackInfo}`;
                        
                        // Extract track number and update individual button
                        const trackMatch = lastLine.match(/Downloading (\d+)\/(\d+): (.+)/);
                        if (trackMatch) {
                            const trackIndex = parseInt(trackMatch[1]) - 1; // Convert to 0-based index
                            this.updateTrackButtonToLoading(trackIndex);
                        }
                    } else if (lastLine.includes('complete')) {
                        text.innerHTML = `${this.createIcon('success')} Downloaded`;
                    } else if (lastLine.startsWith('ISSUES_DETECTED:')) {
                        // Parse the issues data
                        const issuesData = lastLine.replace('ISSUES_DETECTED:', '');
                        try {
                            problemTracks = JSON.parse(issuesData);
                        } catch (e) {
                            console.error('Failed to parse issues data:', e);
                        }
                    }
                }
                
                // Check for individual track completion
                chunk.split('\n').forEach(line => {
                    if (line.includes('Download completed for:')) {
                        const trackTitle = line.split('Download completed for: ')[1];
                        if (trackTitle) {
                            // Check if it's a preview or full download
                            const isPreview = trackTitle.includes('(preview only)');
                            const cleanTitle = trackTitle.replace(' (preview only)', '').trim();
                            this.updateTrackButtonToComplete(cleanTitle, isPreview);
                        }
                    } else if (line.includes('Download failed for:')) {
                        const trackTitle = line.split('Download failed for: ')[1];
                        if (trackTitle) {
                            this.updateTrackButtonToFailed(trackTitle.trim(), 'The following track could not be downloaded at full quality due to content restrictions, authentication, or privacy of the track.');
                        }
                    }
                });
            }

            // Success state - green with checkmark
            button.style.background = '#10b981';
            button.style.color = 'white';
            text.innerHTML = `${this.createIcon('success')} Downloaded`;
            button.disabled = false;

            // Issues are now handled per-track with hover popups

        } catch (error) {
            console.error('Custom download error:', error);
            text.innerHTML = `${this.createIcon('error')} Download Failed`;
            button.style.background = '#ef4444';
            button.style.color = 'white';
            
            // Reset button after 3 seconds
            setTimeout(() => {
                text.innerHTML = `${this.createIcon('folder')} Custom Path & Name`;
                button.style.background = '';
                button.style.color = '';
                button.disabled = false;
            }, 3000);
        }
    }

    updateTrackButtonToLoading(trackIndex) {
        const trackItem = document.querySelector(`[data-track-index="${trackIndex}"]`);
        if (trackItem) {
            const downloadBtn = trackItem.querySelector('.download-btn');
            const icon = downloadBtn.querySelector('.btn-icon');
            
            // Show loading state - replace download icon with loading icon
            icon.innerHTML = this.createIcon('loading');
            downloadBtn.disabled = true;
        }
    }

    updateTrackButtonToComplete(trackTitle, isPreview) {
        // Find the track item by matching the title
        const trackItems = document.querySelectorAll('.track-item');
        trackItems.forEach(trackItem => {
            const titleElement = trackItem.querySelector('.track-title');
            if (titleElement && titleElement.textContent.trim() === trackTitle) {
                const downloadBtn = trackItem.querySelector('.download-btn');
                const icon = downloadBtn.querySelector('.btn-icon');
                
                // Update to success state
                icon.innerHTML = this.createIcon('success');
                
                if (isPreview) {
                    // Preview downloads get orange color
                    downloadBtn.style.background = '#f97316';
                    downloadBtn.title = 'Preview only (30 seconds)';
                } else {
                    // Full downloads get green color
                    downloadBtn.style.background = '#10b981';
                    downloadBtn.title = 'Downloaded successfully';
                }
                
                downloadBtn.style.color = 'white';
                downloadBtn.disabled = false;
            }
        });
    }

    updateTrackButtonToFailed(trackTitle, errorMessage = 'Download failed') {
        // Find the track item by matching the title
        const trackItems = document.querySelectorAll('.track-item');
        trackItems.forEach(trackItem => {
            const titleElement = trackItem.querySelector('.track-title');
            if (titleElement && titleElement.textContent.trim() === trackTitle) {
                const downloadBtn = trackItem.querySelector('.download-btn');
                const icon = downloadBtn.querySelector('.btn-icon');
                
                // Update to failed state with info icon and hover popup
                icon.innerHTML = this.createIcon('info');
                downloadBtn.style.background = '#ef4444';
                downloadBtn.style.color = 'white';
                downloadBtn.title = errorMessage;
                downloadBtn.disabled = false;
                
                // Add error class for additional styling
                downloadBtn.classList.add('error-state');
            }
        });
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
        
        // Remove any download issues display
        const existingIssues = document.getElementById('downloadIssues');
        if (existingIssues) {
            existingIssues.remove();
        }
        
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

    showError(message) {
        const errorDiv = document.getElementById('errorMessage');
        errorDiv.textContent = message;
        errorDiv.classList.remove('hidden');
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

    createIcon(type) {
        const icons = {
            download: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
            success: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20,6 9,17 4,12"/></svg>',
            error: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
            folder: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>'
        };
        return icons[type] || '';
    }
}

// Toggle serverless notice details
function toggleNoticeDetails() {
    const details = document.getElementById('noticeDetails');
    details.classList.toggle('hidden');
    event.preventDefault();
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SoundclouderApp();
});