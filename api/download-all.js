const { create: createYoutubeDl } = require('youtube-dl-exec');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

// Create youtube-dl instance - Vercel will handle the binary
const youtubedl = createYoutubeDl();

// Helper function to sanitize filenames
function sanitizeFilename(filename) {
    return filename
        .replace(/[<>:"/\\|?*]/g, '-')  // Replace invalid characters
        .replace(/\s+/g, ' ')          // Replace multiple spaces with single space
        .trim()                        // Remove leading/trailing whitespace
        .substring(0, 255);            // Limit length to 255 characters
}

module.exports = async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { tracks, playlistTitle } = req.body;

    if (!tracks || !Array.isArray(tracks)) {
        return res.status(400).json({ error: 'Invalid tracks data' });
    }

    // Set headers for streaming response
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Use temp directory for Vercel
    const tempDir = os.tmpdir();
    const playlistDir = path.join(tempDir, sanitizeFilename(playlistTitle));

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
        res.write(`Note: Files are temporarily stored on the server. This feature is limited in serverless environments.\n`);
        
        if (problemTracks.length > 0) {
            res.write(`\nISSUES_DETECTED:${JSON.stringify(problemTracks)}\n`);
        }
        
        res.end();

    } catch (error) {
        console.error('Download all error:', error);
        res.write(`Error: ${error.message}\n`);
        res.end();
    }
} 