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

### Render Deployment

🚀 **Production Ready**: Fully functional deployment on Render with complete audio download capabilities.

#### ✅ **Full Functionality on Render:**
- ✅ **Real SoundCloud playlist fetching**
- ✅ **Complete audio file downloading**
- ✅ **Custom file paths and naming**
- ✅ **Individual track downloads**
- ✅ **All UI improvements and animations**
- ✅ **Error handling with hover tooltips**
- ✅ **Duplicate prevention system**

#### **Deployment Configuration:**
- `render.yaml` - Automatic yt-dlp installation during build
- `server.js` - Full Express server with all functionality
- `package.json` - Complete dependency list
- **No limitations** - Full server environment

#### **Deploy to Render:**
1. **Fork/Clone this repository**
2. **Sign up at [render.com](https://render.com)**
3. **Connect GitHub repository**
4. **Render auto-detects Node.js and installs dependencies**
5. **yt-dlp installed automatically via render.yaml**
6. **Full functionality available immediately**

#### **Custom Domain Setup:**
- Add custom domain in Render dashboard
- Point your DNS to Render's servers
- SSL certificate automatically provisioned
- **Estimated cost**: $0-7/month (750 free hours)

**Local Development**:
```bash
git clone https://github.com/prestonschlagheck/cnvrtr.git
cd soundclouder
npm install
pip install yt-dlp  # Required for audio processing
npm start
```

## Dependencies

### Production & Development
- `express` - Web framework and API server
- `youtube-dl-exec` - SoundCloud content extraction wrapper
- `fs-extra` - Enhanced file system operations
- `cors` - Cross-origin request handling
- `yt-dlp` - System binary for audio processing (auto-installed via render.yaml)
- `nodemon` - Development server with auto-restart

## Legal Notice

**Important**: This tool is for personal use only. Users are responsible for complying with SoundCloud's Terms of Service and applicable copyright laws. Only download content you have permission to download.

## Development

### Project Structure
```
├── index.html       # Landing page
├── app.html         # Main application  
├── script.js        # Frontend logic
├── styles.css       # Styling
├── server.js        # Express server with full functionality
├── package.json     # Dependencies and scripts
├── render.yaml      # Render deployment configuration
└── README.md        # Documentation
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