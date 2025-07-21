const { create: createYoutubeDl } = require('youtube-dl-exec');
const { spawn } = require('child_process');

module.exports = async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

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

        // In a serverless environment, we need to be careful with binary paths
        // Try to use yt-dlp from PATH or use youtube-dl-exec
        try {
            // Stream the audio directly to the response using youtube-dl-exec
            const youtubedl = createYoutubeDl();
            
            // Create a temporary download and stream it
            const audioStream = await youtubedl(url, {
                extractAudio: true,
                audioFormat: 'mp3',
                audioQuality: '0',
                embedMetadata: true,
                noWarnings: true,
                output: '-' // Output to stdout
            });

            // If youtubedl returns a buffer or stream, pipe it
            if (audioStream && typeof audioStream.pipe === 'function') {
                audioStream.pipe(res);
            } else {
                throw new Error('Unable to stream audio');
            }

        } catch (streamError) {
            console.error('Streaming error:', streamError);
            
            // Fallback: Return an error message
            if (!res.headersSent) {
                res.status(500).json({ 
                    error: 'Failed to stream track. Individual track downloads may not work in serverless environments.',
                    suggestion: 'Try using the "Download All" feature instead.'
                });
            }
        }

    } catch (error) {
        console.error('Error downloading track:', error);
        if (!res.headersSent) {
            res.status(500).json({ 
                error: 'Failed to download track',
                details: 'Individual downloads are limited in serverless environments. Please use batch download instead.'
            });
        }
    }
} 