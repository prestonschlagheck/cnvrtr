# Soundclouder - Professional SoundCloud Playlist Downloader

A professional SoundCloud playlist downloader and converter tool that transforms any playlist into high-quality MP3 files.

## Features

- **Playlist Support**: Download entire SoundCloud playlists with one click
- **High Quality**: Convert to MP3 format with best available quality
- **Batch Processing**: Handle multiple tracks efficiently
- **Modern UI**: Clean, professional interface
- **Real-time Progress**: Track download progress in real-time

## Railway Deployment

This project is configured for easy deployment on Railway. Follow these steps:

### 1. Connect to Railway

1. Go to [Railway](https://railway.app)
2. Create a new project
3. Connect your GitHub repository
4. Railway will automatically detect the Dockerfile and deploy

### 2. Environment Variables (Optional)

The following environment variables can be configured in Railway:

- `NODE_ENV`: Set to `production` (default)
- `PORT`: Port number (Railway sets this automatically)

### 3. Deployment

Railway will automatically:
- Build the Docker image using the provided Dockerfile
- Install all dependencies including yt-dlp
- Start the application on the assigned port
- Provide a public URL for your application

### 4. Custom Domain

To add a custom domain:
1. Go to your Railway project settings
2. Navigate to the "Domains" section
3. Add your custom domain
4. Configure DNS settings as instructed by Railway

## Local Development

### Prerequisites

- Node.js 18+
- yt-dlp (will be installed automatically)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd soundclouder

# Install dependencies
npm install

# Start the development server
npm run dev
```

The application will be available at `http://localhost:3000`

## Usage

1. Open the application in your browser
2. Paste a SoundCloud playlist or track URL
3. Click "CNVRT." to start the download
4. Wait for the conversion to complete
5. Download your MP3 files

## Technical Details

- **Backend**: Node.js with Express
- **Frontend**: Vanilla JavaScript with modern CSS
- **Audio Processing**: yt-dlp for high-quality audio extraction
- **Deployment**: Docker container optimized for Railway

## Troubleshooting

### Railway Deployment Issues

If you encounter deployment issues:

1. **Build Failures**: Check the Railway logs for specific error messages
2. **yt-dlp Installation**: The Dockerfile includes multiple fallback methods for yt-dlp installation
3. **Port Issues**: Railway automatically sets the PORT environment variable

### Common Issues

- **CORS Errors**: The application includes CORS middleware for cross-origin requests
- **Memory Issues**: The application is optimized for Railway's memory constraints
- **Timeout Issues**: Long downloads are handled with streaming responses

## License

MIT License - see LICENSE file for details. 