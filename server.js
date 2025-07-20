const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');
const { create: createYoutubeDl } = require('youtube-dl-exec');
const { spawn } = require('child_process');

// Create a custom youtube-dl instance with the specific binary path
const youtubedl = createYoutubeDl('/Users/prestonschlagheck/Library/Python/3.9/bin/yt-dlp');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Parse form data
app.use(express.static('public'));

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/app.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'app.html'));
});

// Get playlist info
app.post('/api/playlist-info', async (req, res) => {
    try {
        const { url } = req.body;
        
        if (!url || !url.includes('soundcloud.com')) {
            return res.status(400).json({ error: 'Invalid SoundCloud URL' });
        }

        console.log('Fetching playlist info for:', url);
        
        // Check if it's a playlist/set URL
        const isPlaylist = url.includes('/sets/');
        
        let info;
        
        if (isPlaylist) {
            // Get playlist information with flat extraction
            try {
                info = await youtubedl(url, {
                    flatPlaylist: true,
                    dumpSingleJson: true,
                    noWarnings: true
                });
                
                // If we don't get entries, try a different approach
                if (!info || !info.entries) {
                    console.log('Trying alternative playlist extraction method...');
                    info = await youtubedl(url, {
                        extractFlat: 'in_playlist',
                        dumpSingleJson: true,
                        noWarnings: true,
                        noCheckCertificates: true
                    });
                }
            } catch (playlistError) {
                console.error('Playlist error:', playlistError);
                return res.status(500).json({ 
                    error: 'Failed to access SoundCloud playlist. Please check the URL and ensure the playlist is public.',
                    details: playlistError.message || 'Unknown error occurred while fetching playlist'
                });
            }
        } else {
            // Single track - get its info and treat as a single-item playlist
            console.log('Processing single track URL:', url);
            info = await youtubedl(url, {
                dumpSingleJson: true,
                noWarnings: true,
                noCheckCertificates: true
            });
        }

        // Debug: Log the structure we get from yt-dlp
        if (info) {
            const infoStr = JSON.stringify(info, null, 2);
            console.log('Raw info received:', infoStr.length > 1000 ? infoStr.substring(0, 1000) + '...' : infoStr);
        } else {
            console.log('No info received from yt-dlp');
        }

        // Handle playlist response
        if (info && info.entries) {
            const tracks = info.entries.map((entry, index) => ({
                id: entry.id || entry.ie_key + '_' + index,
                title: entry.title || `Track ${index + 1}`,
                uploader: entry.uploader || entry.uploader_id || info.uploader || 'Unknown',
                duration: entry.duration || null,
                bpm: entry.bpm || null, // BPM if available, otherwise null
                url: entry.url || entry.webpage_url || entry.original_url,
                thumbnail: entry.thumbnail || (entry.thumbnails && entry.thumbnails[0] ? entry.thumbnails[0].url : null)
            })).filter(track => track.url); // Only include tracks with valid URLs

            // If we have track URLs but no proper titles, fetch detailed metadata for ALL tracks
            const needsDetailedInfo = tracks.some(track => track.title.startsWith('Track '));
            
            if (needsDetailedInfo && tracks.length <= 50) { // Limit to 50 tracks for performance
                console.log(`Fetching detailed track information for ${tracks.length} tracks...`);
                try {
                    // Fetch detailed info for ALL tracks to get proper titles
                    const detailedTracks = await Promise.all(
                        tracks.map(async (track, index) => {
                            try {
                                console.log(`Fetching details for track ${index + 1}/${tracks.length}...`);
                                const trackInfo = await youtubedl(track.url, {
                                    dumpSingleJson: true,
                                    noWarnings: true,
                                    noCheckCertificates: true
                                });
                                return {
                                    ...track,
                                    title: trackInfo.title || track.title,
                                    uploader: trackInfo.uploader || track.uploader,
                                    duration: trackInfo.duration || track.duration,
                                    thumbnail: trackInfo.thumbnail || track.thumbnail
                                };
                            } catch (e) {
                                console.error(`Failed to get details for track ${index + 1}:`, e.message);
                                return track; // Return original track if detailed fetch fails
                            }
                        })
                    );
                    
                    // Replace all tracks with detailed info
                    tracks.splice(0, tracks.length, ...detailedTracks);
                    console.log('Finished fetching detailed track information.');
                } catch (error) {
                    console.error('Error fetching detailed track info:', error);
                }
            }

            res.json({
                title: info.title || info.playlist_title || 'SoundCloud Playlist',
                uploader: info.uploader || info.playlist_uploader || 'Unknown',
                tracks: tracks,
                playlist_count: info.playlist_count || tracks.length
            });
        } 
        // Handle single track response
        else if (info && info.title) {
            res.json({
                title: `Single Track: ${info.title}`,
                uploader: info.uploader,
                tracks: [{
                    id: info.id,
                    title: info.title,
                    uploader: info.uploader,
                    duration: info.duration,
                    bpm: info.bpm || null,
                    url: info.webpage_url || url,
                    thumbnail: info.thumbnail
                }]
            });
        } else {
            return res.status(400).json({ error: 'No track information found' });
        }

    } catch (error) {
        console.error('Error fetching playlist info:', error);
        
        let errorMessage = 'Failed to fetch track information';
        if (error.message && error.message.includes('404')) {
            errorMessage = 'Track or playlist not found. Please check the URL and ensure it is publicly accessible.';
        } else if (error.message && error.message.includes('HTTP Error')) {
            errorMessage = 'SoundCloud access error. The content may be restricted or private.';
        }
        
        res.status(500).json({ 
            error: errorMessage,
            details: 'Try using individual track URLs instead of playlist URLs if this continues.'
        });
    }
});

// Download all tracks in a playlist to user's Downloads folder
app.post('/api/download-all', async (req, res) => {
    try {
        const { tracks, playlistTitle } = req.body;
        
        if (!tracks || !Array.isArray(tracks) || tracks.length === 0) {
            return res.status(400).json({ error: 'No tracks provided' });
        }
        
        // Clean the playlist title for use as folder name
        const cleanTitle = playlistTitle.replace(/[<>:"/\\|?*]/g, '-').trim();
        const userHome = require('os').homedir();
        const downloadPath = path.join(userHome, 'Downloads', cleanTitle);
        
        // Create the directory if it doesn't exist
        await fs.ensureDir(downloadPath);
        
        console.log(`Starting download of ${tracks.length} tracks to: ${downloadPath}`);
        
        // Set up Server-Sent Events for progress updates
        res.writeHead(200, {
            'Content-Type': 'text/plain',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*'
        });
        
        let completed = 0;
        let failed = 0;
        
        // Download tracks sequentially to avoid overwhelming the server
        for (let i = 0; i < tracks.length; i++) {
            const track = tracks[i];
            try {
                res.write(`Downloading ${i + 1}/${tracks.length}: ${track.title}\n`);
                
                // Clean the track title for filename
                const cleanTrackTitle = track.title.replace(/[<>:"/\\|?*]/g, '-').trim();
                const filename = `${cleanTrackTitle}.mp3`;
                const filepath = path.join(downloadPath, filename);
                
                // Download the track
                const ytdlp = spawn('/Users/prestonschlagheck/Library/Python/3.9/bin/yt-dlp', [
                    track.url,
                    '-x',                      // Extract audio
                    '--audio-format', 'mp3',   // Force MP3 format
                    '--audio-quality', '0',    // Best quality
                    '--embed-metadata',        // Embed track metadata
                    '-o', filepath,            // Output directly as .mp3 file
                    '--no-warnings'
                ], {
                    env: { ...process.env, PATH: process.env.PATH + ':/Users/prestonschlagheck/Library/Python/3.9/bin' }
                });
                
                await new Promise((resolve, reject) => {
                    ytdlp.on('close', (code) => {
                        if (code === 0) {
                            completed++;
                            res.write(`[SUCCESS] Downloaded: ${track.title}\n`);
                            resolve();
                        } else {
                            failed++;
                            res.write(`[FAILED] Failed: ${track.title}\n`);
                            resolve(); // Continue with next track even if one fails
                        }
                    });
                    
                    ytdlp.on('error', (error) => {
                        failed++;
                        res.write(`[ERROR] Error downloading ${track.title}: ${error.message}\n`);
                        resolve();
                    });
                });
                
                // Small delay between downloads
                await new Promise(resolve => setTimeout(resolve, 500));
                
            } catch (error) {
                failed++;
                res.write(`[ERROR] Error downloading ${track.title}: ${error.message}\n`);
            }
        }
        
        res.write(`\n[COMPLETE] Download complete! ${completed} successful, ${failed} failed.\n`);
        res.write(`[FOLDER] Files saved to: ${downloadPath}\n`);
        res.end();
        
    } catch (error) {
        console.error('Error in download all:', error);
        res.status(500).json({ error: 'Failed to download tracks', details: error.message });
    }
});

// Download single track - stream directly to browser
app.post('/api/download-track', async (req, res) => {
    try {
        const { url, title } = req.body;
        
        if (!url || !title) {
            return res.status(400).json({ error: 'URL and title are required' });
        }

        const sanitizedTitle = title.replace(/[^\w\s-]/g, '').trim();
        console.log('Streaming track:', title);

        // Set headers for file download
        res.setHeader('Content-Disposition', `attachment; filename="${sanitizedTitle}.mp3"`);
        res.setHeader('Content-Type', 'audio/mpeg');

        // Stream the audio directly to the response
        const ytdlp = spawn('/Users/prestonschlagheck/Library/Python/3.9/bin/yt-dlp', [
            url,
            '-x',                     // Extract audio
            '--audio-format', 'mp3',  // Force MP3 format
            '--audio-quality', '0',   // Best quality
            '--embed-metadata',       // Embed track metadata
            '--no-warnings',
            '--output', '-'           // Output to stdout
        ]);

        ytdlp.stdout.pipe(res);

        ytdlp.on('error', (error) => {
            console.error('yt-dlp error:', error);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Failed to download track' });
            }
        });

        ytdlp.stderr.on('data', (data) => {
            console.error('yt-dlp stderr:', data.toString());
        });

        ytdlp.on('close', (code) => {
            if (code !== 0 && !res.headersSent) {
                res.status(500).json({ error: 'Download failed' });
            }
            console.log(`Download completed for: ${title}`);
        });

    } catch (error) {
        console.error('Error downloading track:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to download track' });
        }
    }
});

// Get track preview URL (for audio preview without downloading)
app.post('/api/track-preview', async (req, res) => {
    try {
        const { url } = req.body;
        
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        // Get track info including preview URL if available
        const info = await youtubedl(url, {
            dumpSingleJson: true,
            noWarnings: true
        });

        // Send back preview info
        res.json({
            title: info.title,
            duration: info.duration,
            thumbnail: info.thumbnail,
            // Note: SoundCloud direct streaming might not work due to CORS
            previewUrl: info.url || null
        });

    } catch (error) {
        console.error('Error getting track preview:', error);
        res.status(500).json({ error: 'Failed to get track preview' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
}); 