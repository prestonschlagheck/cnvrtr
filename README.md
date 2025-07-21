# CNVRTR - SoundCloud Playlist Downloader

A professional DJ music conversion tool for downloading SoundCloud playlists.

## Features

- Download entire SoundCloud playlists
- Custom file path and naming options
- Real-time download progress tracking
- Individual track download buttons with status indicators
- Error handling with hover tooltips
- Duplicate prevention system
- Modern, responsive UI

## Installation

1. Clone the repository:
```bash
git clone https://github.com/prestonschlagheck/cnvrtr.git
cd soundclouder
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Open your browser to `http://localhost:3000`

## Deployment

### Local Development
The app works fully when running locally with all download features supported.

### Vercel Deployment

🎯 **Live Demo**: The app is deployed on Vercel as a UI demonstration.

#### ✅ **What Works on Vercel:**
- Complete UI/UX demonstration
- Playlist URL processing (demo mode)
- All frontend functionality and animations
- Error handling and progress tracking interfaces

#### ⚠️ **Serverless Limitations:**
- **No Audio Downloads**: Requires system binaries (yt-dlp) not available in serverless
- **Demo Data Only**: Shows simulated playlist information
- **No File System Access**: Cannot save files to user's computer
- **No Custom Paths**: Serverless functions don't have persistent storage

#### **Deployment Configuration:**
- `vercel.json` - Minimal Vercel configuration following best practices
- `/api` folder - Serverless functions for demo endpoints  
- Static files in root - Proper Vercel static file serving
- Zero dependencies - Removed problematic packages

#### **For Production Use:**
**Recommended hosting platforms for full functionality:**
- **Railway** - Full Node.js environment with persistent storage
- **Render** - Container-based hosting with file system access
- **Traditional VPS** - Complete control (DigitalOcean, Linode, etc.)
- **Docker** - Custom environment with required binaries

**Local Development** (Full functionality):
```bash
git clone https://github.com/prestonschlagheck/cnvrtr.git
cd soundclouder
npm install
pip install yt-dlp  # Required for audio processing
npm start
```

## Dependencies

### Vercel Deployment (Current)
- **Zero NPM dependencies** - Optimized for serverless deployment
- Pure serverless functions with demo data
- Static file serving only

### Local Development (Full Functionality)
- `express` - Web framework
- `youtube-dl-exec` - SoundCloud content extraction  
- `fs-extra` - File system operations
- `cors` - Cross-origin requests
- `yt-dlp` - System binary for audio processing (via pip)

## Legal Notice

**Important**: This tool is for personal use only. Users are responsible for complying with SoundCloud's Terms of Service and applicable copyright laws. Only download content you have permission to download.

## Development

### Project Structure
```
├── index.html       # Landing page
├── app.html         # Main application  
├── script.js        # Frontend logic
├── styles.css       # Styling
├── api/             # Vercel serverless functions
│   ├── playlist-info.js
│   ├── download-all.js
│   ├── download-custom.js
│   ├── download-track.js
│   └── track-preview.js
├── index.html       # Landing page
├── app.html         # Main application
├── script.js        # Frontend logic
├── styles.css       # Styling
└── vercel.json      # Vercel deployment config
```

### Local Development
```bash
npm run dev  # Uses nodemon for auto-restart
```

### Environment Variables
No environment variables required for basic functionality.

## License

MIT License - See LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

**Note**: For production use with full download capabilities, consider deploying to a traditional server environment rather than serverless platforms. 