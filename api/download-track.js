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
        const { url, title } = req.body;
        
        if (!url || !title) {
            return res.status(400).json({ error: 'URL and title are required' });
        }

        // Return error response explaining serverless limitations
        res.status(503).json({ 
            error: 'Individual track downloads not supported in serverless environment',
            title: title,
            message: 'Individual track streaming requires system binaries (yt-dlp) and direct file system access that are not available in Vercel\'s serverless environment.',
            suggestions: [
                'Use the "Download All" feature for playlist processing',
                'Run the application locally for full download capabilities',
                'Deploy to a traditional server with full system access'
            ],
            localSetup: {
                steps: [
                    'Clone this repository locally',
                    'Install dependencies: npm install', 
                    'Install yt-dlp: pip install yt-dlp',
                    'Run locally: npm start',
                    'Individual track downloads will work at http://localhost:3000'
                ]
            },
            alternativeHosts: [
                'Railway - Full server environment',
                'Render - Container-based hosting', 
                'Traditional VPS - Complete system access',
                'Docker containers - Custom environment'
            ]
        });

    } catch (error) {
        console.error('Individual download limitation:', error);
        res.status(500).json({ 
            error: 'Serverless environment limitation',
            details: 'Individual track downloads require local deployment with full system access to audio processing binaries.'
        });
    }
} 