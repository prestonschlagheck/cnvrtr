module.exports = async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { url } = req.body;
        
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        // Return demo preview info since we can't access SoundCloud's API
        res.json({
            title: 'Demo Track Preview (Serverless Limitation)',
            duration: 180,
            thumbnail: null,
            previewUrl: null,
            _demo: true,
            _message: 'Track preview functionality requires system binaries (yt-dlp) not available in serverless environments. This is a demo response.',
            limitations: {
                reason: 'SoundCloud API access and audio processing requires system binaries',
                environment: 'Vercel serverless functions cannot access yt-dlp',
                solution: 'Run locally for full preview functionality'
            },
            localAlternative: {
                setup: [
                    'Clone repository locally',
                    'Install yt-dlp: pip install yt-dlp', 
                    'Run: npm start',
                    'Full preview functionality available at localhost:3000'
                ]
            }
        });

    } catch (error) {
        console.error('Track preview limitation:', error);
        res.status(500).json({ 
            error: 'Track preview not supported in serverless environment',
            details: 'Preview functionality requires local deployment with yt-dlp access.'
        });
    }
} 