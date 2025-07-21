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
The app is configured for Vercel deployment with the following considerations:

#### ✅ **What Works on Vercel:**
- Playlist information fetching
- Track metadata extraction
- UI and frontend functionality
- Progress tracking and status updates

#### ⚠️ **Limitations on Vercel:**
- **File Downloads**: Due to serverless limitations, downloaded files are stored temporarily and may not be accessible to users
- **Custom Paths**: Custom download paths don't work in serverless environments
- **Individual Track Downloads**: Limited functionality due to streaming restrictions
- **Large Playlists**: May timeout due to serverless function limits (300 seconds max)

#### **Vercel Configuration:**
The project includes:
- `vercel.json` - Deployment configuration
- `/api` folder - Serverless functions for each endpoint
- Static file serving from `/public` folder

#### **For Full Functionality:**
Consider deploying to platforms that support persistent file systems:
- Traditional VPS (DigitalOcean, Linode)
- Railway
- Render
- Heroku

## Dependencies

- `express` - Web framework
- `youtube-dl-exec` - SoundCloud content extraction
- `fs-extra` - File system operations
- `cors` - Cross-origin requests

## Legal Notice

**Important**: This tool is for personal use only. Users are responsible for complying with SoundCloud's Terms of Service and applicable copyright laws. Only download content you have permission to download.

## Development

### Project Structure
```
├── public/           # Frontend files
│   ├── index.html   # Landing page
│   ├── app.html     # Main application
│   ├── script.js    # Frontend logic
│   └── styles.css   # Styling
├── api/             # Vercel serverless functions
│   ├── playlist-info.js
│   ├── download-all.js
│   ├── download-custom.js
│   ├── download-track.js
│   └── track-preview.js
├── server.js        # Local development server
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