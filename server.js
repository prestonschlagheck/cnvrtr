const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');
const { spawn } = require('child_process');
const { promisify } = require('util');
const { exec } = require('child_process');
const execAsync = promisify(exec);
const os = require('os');

// Helper function to run yt-dlp with proper command structure
async function runYtDlp(url, options = {}) {
    return new Promise((resolve, reject) => {
        const args = [url];
        
        if (options.dumpSingleJson) {
            args.push('--dump-single-json');
        }
        if (options.flatPlaylist) {
            args.push('--flat-playlist');
        }
        if (options.noWarnings) {
            args.push('--no-warnings');
        }
        if (options.noCheckCertificates) {
            args.push('--no-check-certificates');
        }
        
        const ytdlpCommand = findYtDlpCommand();
        const ytdlpArgs = ['-m', 'yt_dlp', ...args];
        console.log('Running yt-dlp with command:', ytdlpCommand, 'args:', ytdlpArgs);
        
        const ytdlp = spawn(ytdlpCommand, ytdlpArgs);
        let stdout = '';
        let stderr = '';
        
        ytdlp.stdout.on('data', (data) => {
            stdout += data.toString();
        });
        
        ytdlp.stderr.on('data', (data) => {
            stderr += data.toString();
        });
        
        ytdlp.on('close', (code) => {
            if (code === 0) {
                try {
                    const result = JSON.parse(stdout);
                    resolve(result);
                } catch (e) {
                    reject(new Error('Failed to parse yt-dlp output'));
                }
            } else {
                reject(new Error(`yt-dlp failed with code ${code}: ${stderr}`));
            }
        });
        
        ytdlp.on('error', (error) => {
            reject(error);
        });
    });
}

// Helper function to find yt-dlp binary location
function findYtDlpCommand() {
    // Use python3 -m yt_dlp since that's how it's installed
    return 'python3';
}

// Concurrency limiter to prevent overwhelming the system while speeding up metadata fetches
function createConcurrencyLimiter(limit) {
    let active = 0;
    const queue = [];

    const runNext = () => {
        if (active >= limit || queue.length === 0) return;
        active++;
        const { fn, resolve, reject } = queue.shift();
        Promise.resolve()
            .then(fn)
            .then(resolve)
            .catch(reject)
            .finally(() => {
                active--;
                runNext();
            });
    };

    return function schedule(fn) {
        return new Promise((resolve, reject) => {
            queue.push({ fn, resolve, reject });
            runNext();
        });
    };
}

console.log('Using direct yt-dlp spawn approach');

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

// Simple connectivity test endpoint
app.get('/ping', (req, res) => {
    res.status(200).json({ 
        status: 'ok', 
        message: 'pong',
        timestamp: new Date().toISOString()
    });
});

app.get('/app.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'app.html'));
});

// Simple health check endpoint for Railway
app.get('/health', (req, res) => {
    try {
        // Fast health check - don't test yt-dlp here to avoid timeouts
        const checks = {
            server: 'ok',
            timestamp: new Date().toISOString(),
            node_env: process.env.NODE_ENV || 'development',
            port: process.env.PORT || 3000,
            uptime: process.uptime(),
            memory: {
                used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
            }
        };
        
        // Always return 200 for basic health check
        // Railway will retry if the service is truly unavailable
        res.status(200).json({
            status: 'ok',
            checks: checks,
            message: 'Server is running'
        });
        
    } catch (error) {
        res.status(500).json({ 
            status: 'error', 
            message: 'Health check failed',
            error: error.message 
        });
    }
});

// Detailed health check endpoint for debugging
app.get('/health/detailed', async (req, res) => {
    try {
        const checks = {
            server: 'ok',
            approach: 'direct spawn (no wrapper)',
            node_env: process.env.NODE_ENV || 'development',
            path: process.env.PATH || 'not set',
            uptime: process.uptime()
        };
        
        // Test yt-dlp using our helper function
        const ytdlpCommand = findYtDlpCommand();
        checks.ytdlp_command_found = ytdlpCommand;
        
        try {
            const { stdout, stderr } = await execAsync(`${ytdlpCommand} -m yt_dlp --version`);
            checks.ytdlp_version = stdout.trim();
            checks.ytdlp_status = 'ok';
        } catch (error) {
            checks.ytdlp_status = 'error';
            checks.ytdlp_error = error.message;
        }
        
        res.status(200).json({
            status: 'ok',
            checks: checks,
            message: 'Detailed health check completed'
        });
        
    } catch (error) {
        res.status(500).json({ 
            status: 'error', 
            message: 'Detailed health check failed',
            error: error.message 
        });
    }
});

// Get playlist information
app.post('/api/playlist-info', async (req, res) => {
    const { url } = req.body;
    
    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }
    
    try {
        // Check if yt-dlp is available
        try {
            await execAsync('python3 -m yt_dlp --version');
        } catch (error) {
            return res.status(500).json({
                error: 'Service temporarily unavailable',
                details: 'yt-dlp is not available. Please try again later.'
            });
        }
        
        console.log('Processing playlist URL:', url);
        
        // Get playlist info
        const info = await runYtDlp(url, {
            flatPlaylist: true,
            dumpSingleJson: true,
            noWarnings: true,
            noCheckCertificates: true
        });
        
        console.log('Raw info received:', info);
        
        // Handle playlist response
        if (info && info.entries && Array.isArray(info.entries)) {
            const tracks = info.entries.map((entry, index) => ({
                id: entry.id || entry.ie_key + '_' + index,
                title: entry.title || `Track ${index + 1}`,
                uploader: entry.uploader || entry.uploader_id || info.uploader || 'Unknown',
                duration: entry.duration || null,
                url: entry.url || entry.webpage_url || entry.original_url,
                thumbnail: entry.thumbnail || (entry.thumbnails && entry.thumbnails[0] ? entry.thumbnails[0].url : null)
            })).filter(track => track.url); // Only include tracks with valid URLs

            // If we have track URLs but no proper titles, fetch detailed metadata for tracks
            const needsDetailedInfo = tracks.some(track => track.title.startsWith('Track '));
            
            if (needsDetailedInfo) {
                // Process a subset concurrently with a strict time budget to avoid Cloudflare 524
                const startTimeMs = Date.now();
                const timeBudgetMs = parseInt(process.env.PLAYLIST_INFO_BUDGET_MS || '180000', 10); // 3 min budget
                const concurrency = parseInt(process.env.PLAYLIST_INFO_CONCURRENCY || '6', 10);
                const maxTracks = Math.min(tracks.length, parseInt(process.env.PLAYLIST_INFO_MAX || '60', 10));
                const limiter = createConcurrencyLimiter(concurrency);

                const tasks = [];
                for (let i = 0; i < maxTracks; i++) {
                    const idx = i;
                    const track = tracks[idx];
                    tasks.push(
                        limiter(async () => {
                            if (Date.now() - startTimeMs > timeBudgetMs) {
                                return;
                            }
                            try {
                                console.log(`Fetching details concurrently for track ${idx + 1}/${maxTracks}...`);
                                const trackInfo = await runYtDlp(track.url, {
                                    dumpSingleJson: true,
                                    noWarnings: true,
                                    noCheckCertificates: true
                                });
                                if (trackInfo && trackInfo.title) {
                                    tracks[idx].title = trackInfo.title;
                                    tracks[idx].uploader = trackInfo.uploader || tracks[idx].uploader;
                                    tracks[idx].duration = trackInfo.duration;
                                    tracks[idx].thumbnail = trackInfo.thumbnail;
                                }
                            } catch (error) {
                                console.error(`Error fetching details for track ${idx + 1}:`, error.message);
                            }
                        })
                    );
                }

                try {
                    await Promise.allSettled(tasks);
                    console.log('Finished concurrent detailed track information fetch.');
                } catch (error) {
                    console.error('Error during concurrent detailed track info fetch:', error.message);
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
                const outputPath = path.join(playlistDir, `${sanitizedTitle}.mp3`);
                
                // Download with yt-dlp - specifically request MP3 format
                await new Promise((resolve, reject) => {
                    const ytdlpCommand = findYtDlpCommand();
                    const ytdlpArgs = ['-m', 'yt_dlp',
                        track.url,
                        '-o', outputPath,
                        '--format', 'hls_mp3_1_0/best[ext=mp3]/bestaudio[ext=mp3]/bestaudio',
                        '--no-playlist',
                        '--no-keep-video',
                        '--no-write-info-json',
                        '--no-write-description',
                        '--no-write-thumbnail',
                        '--no-warnings',
                        '--no-check-certificates'
                    ];
                    
                    console.log(`Running yt-dlp download with command: ${ytdlpCommand} args:`, ytdlpArgs);
                    const ytdlp = spawn(ytdlpCommand, ytdlpArgs);
                    
                    // Add timeout for Railway deployment
                    const timeout = setTimeout(() => {
                        ytdlp.kill('SIGTERM');
                        reject(new Error('Download timeout after 5 minutes'));
                    }, 5 * 60 * 1000); // 5 minutes
                    
                    ytdlp.on('close', (code) => {
                        clearTimeout(timeout);
                        if (code === 0) {
                            resolve();
                        } else {
                            reject(new Error(`Download failed with code ${code}`));
                        }
                    });
                    
                    ytdlp.on('error', (error) => {
                        clearTimeout(timeout);
                        reject(error);
                    });
                });

                // Check if MP3 file was created
                const files = await fs.readdir(playlistDir);
                const trackFiles = files.filter(file => file.startsWith(sanitizedTitle) && file.endsWith('.mp3'));
                
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
            res.write(`\nProblematic tracks (${problemTracks.length}):\n`);
            problemTracks.forEach(track => {
                res.write(`- ${track.title}: ${track.issue} (${track.reason})\n`);
            });
        }
        
        res.write(`\nFiles saved to: ${playlistDir}\n`);
        res.end();
        
    } catch (error) {
        console.error('Error in download-all:', error);
        res.write(`Error: ${error.message}\n`);
        res.end();
    }
});

// Download custom selection of tracks
app.post('/api/download-custom', async (req, res) => {
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
        console.log(`Starting download of ${tracks.length} selected tracks to: ${playlistDir}`);
        
        // Track problematic downloads
        const problemTracks = [];
        let successCount = 0;

        for (let i = 0; i < tracks.length; i++) {
            const track = tracks[i];
            const trackNum = i + 1;
            
            try {
                res.write(`Downloading ${trackNum}/${tracks.length}: ${track.title}\n`);
                
                const sanitizedTitle = sanitizeFilename(track.title);
                const outputPath = path.join(playlistDir, `${sanitizedTitle}.mp3`);
                
                // Download with yt-dlp - specifically request MP3 format
                await new Promise((resolve, reject) => {
                    const ytdlpCommand = findYtDlpCommand();
                    const ytdlpArgs = ['-m', 'yt_dlp',
                        track.url,
                        '-o', outputPath,
                        '--format', 'hls_mp3_1_0/best[ext=mp3]/bestaudio[ext=mp3]/bestaudio',
                        '--no-playlist',
                        '--no-keep-video',
                        '--no-write-info-json',
                        '--no-write-description',
                        '--no-write-thumbnail',
                        '--no-warnings',
                        '--no-check-certificates'
                    ];
                    
                    console.log(`Running yt-dlp download with command: ${ytdlpCommand} args:`, ytdlpArgs);
                    const ytdlp = spawn(ytdlpCommand, ytdlpArgs);
                    
                    // Add timeout for Railway deployment
                    const timeout = setTimeout(() => {
                        ytdlp.kill('SIGTERM');
                        reject(new Error('Download timeout after 5 minutes'));
                    }, 5 * 60 * 1000); // 5 minutes
                    
                    ytdlp.on('close', (code) => {
                        clearTimeout(timeout);
                        if (code === 0) {
                            resolve();
                        } else {
                            reject(new Error(`Download failed with code ${code}`));
                        }
                    });
                    
                    ytdlp.on('error', (error) => {
                        clearTimeout(timeout);
                        reject(error);
                    });
                });

                // Check if MP3 file was created
                const files = await fs.readdir(playlistDir);
                const trackFiles = files.filter(file => file.startsWith(sanitizedTitle) && file.endsWith('.mp3'));
                
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
            res.write(`\nProblematic tracks (${problemTracks.length}):\n`);
            problemTracks.forEach(track => {
                res.write(`- ${track.title}: ${track.issue} (${track.reason})\n`);
            });
        }
        
        res.write(`\nFiles saved to: ${playlistDir}\n`);
        res.end();
        
    } catch (error) {
        console.error('Error in download-custom:', error);
        res.write(`Error: ${error.message}\n`);
        res.end();
    }
});

// Download a single track
app.post('/api/download-track', async (req, res) => {
    // Accept either JSON body { track: { url, title } } or form-encoded { url, title }
    let track = req.body.track;
    if (!track) {
        const { url, title } = req.body || {};
        if (url) {
            track = { url, title: title || 'SoundCloud Track' };
        }
    }

    if (!track || !track.url) {
        return res.status(400).json({ error: 'Invalid track data' });
    }

    const downloadsDir = path.join(os.homedir(), 'Downloads');
    const sanitizedTitle = sanitizeFilename(track.title || 'SoundCloud Track');
    const outputPath = path.join(downloadsDir, `${sanitizedTitle}.mp3`);

    try {
        await fs.ensureDir(downloadsDir);
        console.log(`Downloading single track: ${track.title}`);

        // Download with yt-dlp - specifically request MP3 format
        await new Promise((resolve, reject) => {
            const ytdlpCommand = findYtDlpCommand();
            const ytdlpArgs = ['-m', 'yt_dlp',
                track.url,
                '-o', outputPath,
                '--format', 'hls_mp3_1_0/best[ext=mp3]/bestaudio[ext=mp3]/bestaudio',
                '--no-playlist',
                '--no-keep-video',
                '--no-write-info-json',
                '--no-write-description',
                '--no-write-thumbnail',
                '--no-warnings',
                '--no-check-certificates'
            ];
            
            console.log(`Running yt-dlp download with command: ${ytdlpCommand} args:`, ytdlpArgs);
            const ytdlp = spawn(ytdlpCommand, ytdlpArgs);
            
            // Add timeout for Railway deployment
            const timeout = setTimeout(() => {
                ytdlp.kill('SIGTERM');
                reject(new Error('Download timeout after 5 minutes'));
            }, 5 * 60 * 1000); // 5 minutes
            
            ytdlp.on('close', (code) => {
                clearTimeout(timeout);
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`Download failed with code ${code}`));
                }
            });
            
            ytdlp.on('error', (error) => {
                clearTimeout(timeout);
                reject(error);
            });
        });

        // Check if MP3 file was created
        const files = await fs.readdir(downloadsDir);
        const trackFiles = files.filter(file => file.startsWith(sanitizedTitle) && file.endsWith('.mp3'));
        
        if (trackFiles.length > 0) {
            const trackFile = trackFiles[0];
            const filePath = path.join(downloadsDir, trackFile);
            const stats = await fs.stat(filePath);
            
            res.setHeader('Content-Disposition', `attachment; filename="${trackFile}"`);
            res.setHeader('Content-Type', 'audio/mpeg');
            res.setHeader('Content-Length', stats.size);
            
            const fileStream = fs.createReadStream(filePath);
            fileStream.pipe(res);
        } else {
            res.status(404).json({ error: 'Downloaded file not found' });
        }

    } catch (error) {
        console.error('Error downloading track:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get track preview/info
app.post('/api/track-preview', async (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    try {
        const trackInfo = await runYtDlp(url, {
            dumpSingleJson: true,
            noWarnings: true,
            noCheckCertificates: true
        });

        res.json({
            title: trackInfo.title,
            uploader: trackInfo.uploader,
            duration: trackInfo.duration,
            thumbnail: trackInfo.thumbnail,
            url: trackInfo.webpage_url || url
        });

    } catch (error) {
        console.error('Error getting track preview:', error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    console.log(`Health check available at http://0.0.0.0:${PORT}/health`);
    console.log(`Detailed health check at http://0.0.0.0:${PORT}/health/detailed`);
}); 