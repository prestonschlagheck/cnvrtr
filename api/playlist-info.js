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
        
        if (!url || !url.includes('soundcloud.com')) {
            return res.status(400).json({ error: 'Invalid SoundCloud URL' });
        }

        // In serverless environment, we can't use youtube-dl-exec
        // Return a demo response to show how the UI works
        const isPlaylist = url.includes('/sets/');
        
        if (isPlaylist) {
            // Return demo playlist data
            res.json({
                title: "Demo Playlist (Serverless Limitation)",
                uploader: "Demo User",
                tracks: [
                    {
                        id: "demo1",
                        title: "Demo Track 1 - Serverless environments cannot download audio",
                        uploader: "Demo Artist",
                        duration: 180,
                        url: url,
                        thumbnail: null
                    },
                    {
                        id: "demo2", 
                        title: "Demo Track 2 - Please run locally for full functionality",
                        uploader: "Demo Artist",
                        duration: 210,
                        url: url,
                        thumbnail: null
                    },
                    {
                        id: "demo3",
                        title: "Demo Track 3 - This is a UI demonstration",
                        uploader: "Demo Artist", 
                        duration: 195,
                        url: url,
                        thumbnail: null
                    }
                ],
                playlist_count: 3,
                _demo: true,
                _message: "This is a demo response. Audio downloading requires system binaries not available in serverless environments like Vercel. Run locally for full functionality."
            });
        } else {
            // Single track demo
            res.json({
                title: "Single Track: Demo (Serverless Limitation)",
                uploader: "Demo User",
                tracks: [{
                    id: "demo_single",
                    title: "Demo Single Track - Serverless environments cannot download audio",
                    uploader: "Demo Artist",
                    duration: 180,
                    url: url,
                    thumbnail: null
                }],
                _demo: true,
                _message: "This is a demo response. Audio downloading requires system binaries not available in serverless environments like Vercel. Run locally for full functionality."
            });
        }

    } catch (error) {
        console.error('Demo API error:', error);
        res.status(500).json({ 
            error: 'Demo API - Full functionality requires local deployment',
            details: 'SoundCloud audio extraction requires system binaries (yt-dlp) that are not available in serverless environments like Vercel. Please run the application locally for full download capabilities.'
        });
    }
} 