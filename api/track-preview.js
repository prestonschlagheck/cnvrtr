const { create: createYoutubeDl } = require('youtube-dl-exec');

// Create youtube-dl instance - Vercel will handle the binary
const youtubedl = createYoutubeDl();

module.exports = async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

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
} 