#!/bin/bash

# Startup script for Railway deployment
echo "🚀 Starting Soundclouder application..."

# Debug information
echo "📊 Environment info:"
echo "  NODE_ENV: $NODE_ENV"
echo "  PORT: $PORT"
echo "  PWD: $(pwd)"
echo "  Node version: $(node --version)"
echo "  NPM version: $(npm --version)"

# Check if yt-dlp is available
echo "🔍 Checking yt-dlp availability:"
which yt-dlp || echo "yt-dlp not found in PATH"
python3 -m yt_dlp --version 2>/dev/null || echo "python3 -m yt_dlp not available"

# List files in current directory
echo "📁 Files in current directory:"
ls -la

# Start the application
echo "📦 Starting Node.js application..."
exec npm start 