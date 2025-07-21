const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');
const { create: createYoutubeDl } = require('youtube-dl-exec');
const { spawn } = require('child_process');
const os = require('os');

// Create a more robust youtube-dl instance
const ytDlpBinary = process.env.NODE_ENV === 'production' ? 'yt-dlp' : 'yt-dlp';
let youtubedl;

try {
    youtubedl = createYoutubeDl({
        ytDlpPath: ytDlpBinary
    });
    console.log('yt-dlp initialized successfully');
} catch (error) {
    console.error('Failed to initialize yt-dlp:', error);
    youtubedl = null;
}

const app = express();
const PORT = process.env.PORT || 3000;

// Helper function to sanitize filenames
function sanitizeFilename(filename) {
    return filename
        .replace(/[<>:"/\\|?*]/g, '-')  // Replace invalid characters
        .replace(/\s+/g, ' ')          // Replace multiple spaces with single space
        .trim()                        // Remove leading/trailing whitespace
        .substring(0, 255);            // Limit length to 255 characters
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('.'));

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/app.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'app.html'));
});

// Health check endpoint to verify yt-dlp is working
app.get('/health', async (req, res) => {
    try {
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        
        // Check multiple things
        const checks = {
            server: 'ok',
            youtubedl_initialized: youtubedl ? 'ok' : 'error',
            node_env: process.env.NODE_ENV || 'development',
            path: process.env.PATH || 'not set'
        };
        
        try {
            const { stdout, stderr } = await execAsync('yt-dlp --version');
            checks.ytdlp_version = stdout.trim();
            checks.ytdlp_status = 'ok';
        } catch (error) {
            checks.ytdlp_status = 'error';
            checks.ytdlp_error = error.message;
        }
        
        // Try which yt-dlp
        try {
            const { stdout } = await execAsync('which yt-dlp');
            checks.ytdlp_path = stdout.trim();
        } catch (error) {
            checks.ytdlp_path = 'not found';
        }
        
        const isHealthy = checks.youtubedl_initialized === 'ok' && checks.ytdlp_status === 'ok';
        
        res.status(isHealthy ? 200 : 500).json({
            status: isHealthy ? 'ok' : 'error',
            checks: checks,
            message: isHealthy ? 'All systems working' : 'Some systems have issues'
        });
        
    } catch (error) {
        res.status(500).json({ 
            status: 'error', 
            message: 'Health check failed',
            error: error.message 
        });
    }
});

// Get playlist info
app.post('/api/playlist-info', async (req, res) => {
    try {
        const { url } = req.body;
        
        if (!url || !url.includes('soundcloud.com')) {
            return res.status(400).json({ error: 'Invalid SoundCloud URL' });
        }

        // Check if yt-dlp is available before proceeding
        if (!youtubedl) {
            return res.status(500).json({ 
                error: 'Service temporarily unavailable',
                details: 'Audio processing service is not properly configured. Please try again later.'
            });
        }

        console.log('Fetching playlist info for:', url);
        
        // Validate URL format more strictly
        const urlStr = String(url).trim();
        if (!urlStr || typeof urlStr !== 'string') {
            return res.status(400).json({ error: 'Invalid URL format' });
        }
        
        // Check if it's a playlist/set URL
        const isPlaylist = urlStr.includes('/sets/');
        
        let info;
        
        try {
            if (isPlaylist) {
                // Get playlist information with flat extraction
                console.log('Processing playlist URL:', urlStr);
                info = await youtubedl(urlStr, {
                    flatPlaylist: true,
                    dumpSingleJson: true,
                    noWarnings: true,
                    noCheckCertificates: true
                });
                
                // If we don't get entries, try a different approach
                if (!info || !info.entries) {
                    console.log('Trying alternative playlist extraction method...');
                    info = await youtubedl(urlStr, {
                        extractFlat: 'in_playlist',
                        dumpSingleJson: true,
                        noWarnings: true,
                        noCheckCertificates: true
                    });
                }
            } else {
                // Single track - get its info and treat as a single-item playlist
                console.log('Processing single track URL:', urlStr);
                info = await youtubedl(urlStr, {
                    dumpSingleJson: true,
                    noWarnings: true,
                    noCheckCertificates: true
                });
            }
        } catch (ytdlError) {
            console.error('yt-dlp error details:', {
                message: ytdlError.message,
                stack: ytdlError.stack,
                url: urlStr
            });
            
            return res.status(500).json({ 
                error: 'Failed to access SoundCloud content',
                details: 'The URL may be private, region-restricted, or the service may be temporarily unavailable.',
                debug: process.env.NODE_ENV === 'development' ? ytdlError.message : undefined
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
    const { tracks, playlistTitle } = req.body;

    if (!tracks || !Array.isArray(tracks)) {
        return res.status(400).json({ error: 'Invalid tracks data' });
    }

    // Set headers for streaming response
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const downloadsDir = path.join(os.homedir(), 'Downloads');
    const playlistDir = path.join(downloadsDir, sanitizeFilename(playlistTitle));

    try {
        await fs.ensureDir(playlistDir);
        console.log(`Starting download of ${tracks.length} tracks to: ${playlistDir}`);
        
        // Track problematic downloads
        const problemTracks = [];
        let successCount = 0;

        for (let i = 0; i < tracks.length; i++) {
            const track = tracks[i];
            const trackNum = i + 1;
            
            try {
                res.write(`Downloading ${trackNum}/${tracks.length}: ${track.title}\n`);
                
                const sanitizedTitle = sanitizeFilename(track.title);
                const outputPath = path.join(playlistDir, `${sanitizedTitle}.%(ext)s`);
                
                // Download with yt-dlp - using restrictive format to prevent duplicates
                await youtubedl(track.url, {
                    output: outputPath,
                    format: 'best[ext=mp3]/best[ext=m4a]/best',
                    extractAudio: true,
                    audioFormat: 'mp3',
                    audioQuality: '0',
                    noPlaylist: true, // Ensure we only get single track
                    keepVideo: false, // Don't keep original video file
                    writeInfoJson: false, // Don't write metadata files
                    writeDescription: false, // Don't write description files
                    writeThumbnail: false // Don't write thumbnail files
                });

                // Check if file was created and get its size/duration
                const files = await fs.readdir(playlistDir);
                const trackFiles = files.filter(file => file.startsWith(sanitizedTitle) && (file.endsWith('.mp3') || file.endsWith('.m4a')));
                
                if (trackFiles.length > 0) {
                    const trackFile = trackFiles[0];
                    const filePath = path.join(playlistDir, trackFile);
                    const stats = await fs.stat(filePath);
                    
                    // Check if file is suspiciously small (likely a 30-second clip)
                    // Files under 1MB are likely truncated/preview versions
                    if (stats.size < 1024 * 1024) { // Less than 1MB
                        problemTracks.push({
                            title: track.title,
                            issue: 'Restricted content (30-second preview only)',
                            reason: 'Region restriction, authentication required, or private track'
                        });
                        res.write(`Download completed for: ${track.title} (preview only)\n`);
                    } else {
                        successCount++;
                        res.write(`Download completed for: ${track.title}\n`);
                    }
                } else {
                    problemTracks.push({
                        title: track.title,
                        issue: 'Download failed',
                        reason: 'Track not accessible or removed'
                    });
                    res.write(`Download failed for: ${track.title}\n`);
                }

            } catch (error) {
                console.error(`Error downloading track ${track.title}:`, error.message);
                
                // Categorize the error
                let issue = 'Download failed';
                let reason = 'Unknown error';
                
                if (error.message.includes('Private')) {
                    issue = 'Private track';
                    reason = 'Track is private or requires authentication';
                } else if (error.message.includes('region') || error.message.includes('geo')) {
                    issue = 'Region restricted';
                    reason = 'Content not available in your region';
                } else if (error.message.includes('removed') || error.message.includes('unavailable')) {
                    issue = 'Track unavailable';
                    reason = 'Track has been removed or is no longer available';
                } else {
                    reason = 'Technical download error';
                }
                
                problemTracks.push({
                    title: track.title,
                    issue: issue,
                    reason: reason
                });
                
                res.write(`Download failed for: ${track.title}\n`);
            }
        }

        // Send completion message with summary
        res.write(`\nDownload complete! ${successCount}/${tracks.length} tracks downloaded successfully.\n`);
        
        if (problemTracks.length > 0) {
            res.write(`\nISSUES_DETECTED:${JSON.stringify(problemTracks)}\n`);
        }
        
        res.end();

    } catch (error) {
        console.error('Download all error:', error);
        res.write(`Error: ${error.message}\n`);
        res.end();
    }
});

// Download all tracks with custom path and name
app.post('/api/download-custom', async (req, res) => {
    const { tracks, playlistTitle, customPath } = req.body;

    if (!tracks || !Array.isArray(tracks)) {
        return res.status(400).json({ error: 'Invalid tracks data' });
    }

    // Set headers for streaming response
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Determine the base directory
    let baseDir;
    if (customPath && customPath.trim()) {
        // Use custom path if provided
        baseDir = path.resolve(customPath.trim());
    } else {
        // Default to Downloads folder
        baseDir = path.join(os.homedir(), 'Downloads');
    }

    const playlistDir = path.join(baseDir, sanitizeFilename(playlistTitle));

    try {
        await fs.ensureDir(playlistDir);
        console.log(`Starting custom download of ${tracks.length} tracks to: ${playlistDir}`);
        
        // Track problematic downloads
        const problemTracks = [];
        let successCount = 0;

        for (let i = 0; i < tracks.length; i++) {
            const track = tracks[i];
            const trackNum = i + 1;
            
            try {
                res.write(`Downloading ${trackNum}/${tracks.length}: ${track.title}\n`);
                
                const sanitizedTitle = sanitizeFilename(track.title);
                const outputPath = path.join(playlistDir, `${sanitizedTitle}.%(ext)s`);
                
                // Download with yt-dlp - using restrictive format to prevent duplicates
                await youtubedl(track.url, {
                    output: outputPath,
                    format: 'best[ext=mp3]/best[ext=m4a]/best',
                    extractAudio: true,
                    audioFormat: 'mp3',
                    audioQuality: '0',
                    noPlaylist: true, // Ensure we only get single track
                    keepVideo: false, // Don't keep original video file
                    writeInfoJson: false, // Don't write metadata files
                    writeDescription: false, // Don't write description files
                    writeThumbnail: false // Don't write thumbnail files
                });

                // Check if file was created and get its size/duration
                const files = await fs.readdir(playlistDir);
                const trackFiles = files.filter(file => file.startsWith(sanitizedTitle) && (file.endsWith('.mp3') || file.endsWith('.m4a')));
                
                if (trackFiles.length > 0) {
                    const trackFile = trackFiles[0];
                    const filePath = path.join(playlistDir, trackFile);
                    const stats = await fs.stat(filePath);
                    
                    // Check if file is suspiciously small (likely a 30-second clip)
                    // Files under 1MB are likely truncated/preview versions
                    if (stats.size < 1024 * 1024) { // Less than 1MB
                        problemTracks.push({
                            title: track.title,
                            issue: 'Restricted content (30-second preview only)',
                            reason: 'Region restriction, authentication required, or private track'
                        });
                        res.write(`Download completed for: ${track.title} (preview only)\n`);
                    } else {
                        successCount++;
                        res.write(`Download completed for: ${track.title}\n`);
                    }
                } else {
                    problemTracks.push({
                        title: track.title,
                        issue: 'Download failed',
                        reason: 'Track not accessible or removed'
                    });
                    res.write(`Download failed for: ${track.title}\n`);
                }

            } catch (error) {
                console.error(`Error downloading track ${track.title}:`, error.message);
                
                // Categorize the error
                let issue = 'Download failed';
                let reason = 'Unknown error';
                
                if (error.message.includes('Private')) {
                    issue = 'Private track';
                    reason = 'Track is private or requires authentication';
                } else if (error.message.includes('region') || error.message.includes('geo')) {
                    issue = 'Region restricted';
                    reason = 'Content not available in your region';
                } else if (error.message.includes('removed') || error.message.includes('unavailable')) {
                    issue = 'Track unavailable';
                    reason = 'Track has been removed or is no longer available';
                } else {
                    reason = 'Technical download error';
                }
                
                problemTracks.push({
                    title: track.title,
                    issue: issue,
                    reason: reason
                });
                
                res.write(`Download failed for: ${track.title}\n`);
            }
        }

        // Send completion message with summary
        res.write(`\nDownload complete! ${successCount}/${tracks.length} tracks downloaded successfully.\n`);
        
        if (problemTracks.length > 0) {
            res.write(`\nISSUES_DETECTED:${JSON.stringify(problemTracks)}\n`);
        }
        
        res.end();

    } catch (error) {
        console.error('Custom download error:', error);
        res.write(`Error: ${error.message}\n`);
        res.end();
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
        const ytdlp = spawn('yt-dlp', [
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

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
}); 