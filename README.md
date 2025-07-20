# Soundclouder 🎵

A simple and modern web application for downloading SoundCloud playlists. Built with a clean, tech-focused design featuring orange accents.

## Features

- 🎶 **Playlist Parsing**: Paste any SoundCloud playlist URL to fetch track information
- ⬇️ **Individual Downloads**: Download tracks one by one
- 📦 **Bulk Download**: Download entire playlists at once
- 🎧 **Audio Preview**: Preview downloaded tracks directly in the browser
- 🔗 **SoundCloud Links**: Click track titles to open original SoundCloud pages
- 🧹 **Easy Cleanup**: Clear all downloads with one click
- 📱 **Responsive Design**: Works on desktop and mobile devices

## Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (version 14 or higher)
- [npm](https://www.npmjs.com/) (comes with Node.js)
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) or [youtube-dl](https://youtube-dl.org/) (required for downloading)

### Installing yt-dlp

**macOS (using Homebrew):**
```bash
brew install yt-dlp
```

**Windows:**
```bash
pip install yt-dlp
```

**Linux:**
```bash
pip install yt-dlp
```

## Installation

1. **Clone or download this repository**
2. **Navigate to the project directory:**
   ```bash
   cd Soundclouder
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

## Usage

1. **Start the server:**
   ```bash
   npm start
   ```

2. **Open your browser and go to:**
   ```
   http://localhost:3000
   ```

3. **Using the application:**
   - Paste a SoundCloud playlist URL (e.g., `https://soundcloud.com/user/sets/playlist-name`)
   - Click "Fetch Playlist" to load the tracks
   - Use "Download All Tracks" to download the entire playlist
   - Or click individual "Download" buttons for specific tracks
   - After downloading, use the preview buttons (▶) to listen to tracks
   - Click track titles to open them on SoundCloud
   - Use "Clear Downloads" to remove all downloaded files

## Development

For development with auto-restart:
```bash
npm run dev
```

## Project Structure

```
Soundclouder/
├── server.js          # Express.js backend server
├── package.json       # Dependencies and scripts
├── public/            # Frontend files
│   ├── index.html     # Main HTML file
│   ├── styles.css     # CSS styling
│   └── script.js      # Frontend JavaScript
├── downloads/         # Downloaded audio files (created automatically)
└── README.md         # This file
```

## API Endpoints

- `POST /api/playlist-info` - Fetch playlist information from SoundCloud URL
- `POST /api/download-track` - Download a single track
- `POST /api/download-all` - Download multiple tracks
- `DELETE /api/clear-downloads` - Clear all downloaded files
- `GET /downloads/:filename` - Serve downloaded audio files

## Technologies Used

- **Backend**: Node.js, Express.js
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Downloader**: youtube-dl-exec (yt-dlp wrapper)
- **Fonts**: Inter (Google Fonts)

## Notes

- **Legal Disclaimer**: This tool is for personal use only. Respect copyright laws and SoundCloud's terms of service.
- **Audio Quality**: Downloads are converted to MP3 format for compatibility.
- **Rate Limiting**: The app downloads tracks sequentially to avoid overwhelming servers.
- **Storage**: Downloaded files are stored in the `downloads/` directory.

## Troubleshooting

### Common Issues

1. **"youtube-dl not found" error:**
   - Make sure yt-dlp is installed and available in your PATH
   - Try reinstalling yt-dlp: `pip install --upgrade yt-dlp`

2. **Downloads failing:**
   - Check your internet connection
   - Verify the SoundCloud URL is valid and publicly accessible
   - Some tracks may be region-restricted or require authentication

3. **Preview not working:**
   - Ensure the track has been downloaded first
   - Check browser console for any JavaScript errors
   - Try clearing downloads and re-downloading

4. **Port already in use:**
   - Change the port in `server.js` or kill the process using port 3000
   - Use: `lsof -ti:3000 | xargs kill -9` (macOS/Linux)

## Contributing

Feel free to submit issues and enhancement requests!

## License

This project is licensed under the MIT License - see the package.json file for details. 