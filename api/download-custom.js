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

    const { tracks, playlistTitle, customPath } = req.body;

    if (!tracks || !Array.isArray(tracks)) {
        return res.status(400).json({ error: 'Invalid tracks data' });
    }

    // Set headers for streaming response
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
        res.write(`🚨 CUSTOM DOWNLOAD - SERVERLESS LIMITATION 🚨\n\n`);
        res.write(`Playlist: ${playlistTitle}\n`);
        res.write(`Custom Path: ${customPath || 'Default Downloads folder'}\n`);
        res.write(`Tracks to download: ${tracks.length}\n\n`);
        
        res.write(`❌ CUSTOM DOWNLOAD FAILED: Serverless Environment Limitation\n\n`);
        res.write(`Custom file paths and audio downloading require:\n`);
        res.write(`- Local file system access\n`);
        res.write(`- System binaries (yt-dlp)\n`);
        res.write(`- Persistent storage\n\n`);
        res.write(`None of these are available in Vercel's serverless environment.\n\n`);
        
        res.write(`✅ TO ENABLE CUSTOM DOWNLOAD FUNCTIONALITY:\n`);
        res.write(`1. Clone this repository locally\n`);
        res.write(`2. Install dependencies: npm install\n`);
        res.write(`3. Install yt-dlp: pip install yt-dlp\n`);
        res.write(`4. Run locally: npm start\n`);
        res.write(`5. Use the custom path feature with full local file system access\n\n`);
        
        res.write(`💡 BENEFITS OF LOCAL DEPLOYMENT:\n`);
        res.write(`- Download to any custom folder path\n`);
        res.write(`- Full audio quality and format options\n`);
        res.write(`- No timeout limitations\n`);
        res.write(`- Direct file system access\n`);
        res.write(`- Persistent storage\n\n`);

        // Simulate custom download progress for demo
        for (let i = 0; i < tracks.length; i++) {
            const track = tracks[i];
            res.write(`❌ Cannot download to custom path: ${track.title}\n`);
            
            // Add a small delay to simulate processing
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        res.write(`\n📊 CUSTOM DOWNLOAD SUMMARY:\n`);
        res.write(`- Target Location: ${customPath || 'Downloads folder'}\n`);
        res.write(`- Attempted: ${tracks.length} tracks\n`);
        res.write(`- Downloaded: 0 tracks\n`);
        res.write(`- Failed: ${tracks.length} tracks (serverless limitation)\n\n`);
        
        res.write(`ℹ️  Custom path downloads require local deployment.\n`);
        res.write(`This demo shows the UI but cannot access the file system.\n`);
        
        res.end();

    } catch (error) {
        console.error('Demo custom download error:', error);
        res.write(`\n❌ Error: ${error.message}\n`);
        res.write(`Custom downloads are not supported in serverless environments.\n`);
        res.end();
    }
} 