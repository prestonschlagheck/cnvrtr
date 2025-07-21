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

    const { tracks, playlistTitle } = req.body;

    if (!tracks || !Array.isArray(tracks)) {
        return res.status(400).json({ error: 'Invalid tracks data' });
    }

    // Set headers for streaming response
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
        res.write(`🚨 SERVERLESS LIMITATION NOTICE 🚨\n\n`);
        res.write(`Playlist: ${playlistTitle}\n`);
        res.write(`Tracks to download: ${tracks.length}\n\n`);
        
        res.write(`❌ DOWNLOAD FAILED: Serverless Environment Limitation\n\n`);
        res.write(`This feature requires system binaries (yt-dlp) that are not available in serverless environments like Vercel.\n\n`);
        
        res.write(`✅ TO ENABLE FULL DOWNLOAD FUNCTIONALITY:\n`);
        res.write(`1. Clone this repository locally\n`);
        res.write(`2. Install dependencies: npm install\n`);
        res.write(`3. Install yt-dlp: pip install yt-dlp\n`);
        res.write(`4. Run locally: npm start\n`);
        res.write(`5. Visit http://localhost:3000\n\n`);
        
        res.write(`💡 ALTERNATIVE HOSTING OPTIONS:\n`);
        res.write(`- Deploy to Railway, Render, or traditional VPS\n`);
        res.write(`- Use Docker containers with persistent storage\n`);
        res.write(`- Run on your own server with full system access\n\n`);

        // Simulate download progress for demo
        for (let i = 0; i < tracks.length; i++) {
            const track = tracks[i];
            res.write(`❌ Cannot download: ${track.title}\n`);
            
            // Add a small delay to simulate processing
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        res.write(`\n📊 SUMMARY:\n`);
        res.write(`- Attempted: ${tracks.length} tracks\n`);
        res.write(`- Downloaded: 0 tracks\n`);
        res.write(`- Failed: ${tracks.length} tracks (serverless limitation)\n\n`);
        
        res.write(`ℹ️  This is a demo running on Vercel's serverless platform.\n`);
        res.write(`For full functionality, please run the application locally.\n`);
        
        res.end();

    } catch (error) {
        console.error('Demo download error:', error);
        res.write(`\n❌ Error: ${error.message}\n`);
        res.write(`This is a limitation of the serverless environment.\n`);
        res.end();
    }
} 