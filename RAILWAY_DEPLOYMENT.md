# Railway Deployment Guide

## Quick Deploy to Railway

### Step 1: Deploy to Railway
1. Go to [Railway.app](https://railway.app)
2. Sign up with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repo: `prestonschlagheck/cnvrtr`
5. Railway will automatically detect and deploy your Node.js app

### Step 2: Configure Custom Domain (Optional)
1. In Railway dashboard, go to your project
2. Click "Settings" → "Domains"
3. Add your custom domain (e.g., `cnvrtr.media`)
4. Update your DNS to point to Railway's CNAME

## Optimizations Made for Railway

### Health Check Improvements
- **Fast health endpoint**: `/health` responds immediately without testing yt-dlp
- **Memory monitoring**: Health check includes memory usage stats
- **10-minute timeout**: Railway health check timeout increased to 600 seconds

### Download Timeouts
- **5-minute timeouts**: All yt-dlp operations have 5-minute timeouts
- **Process cleanup**: Proper SIGTERM handling for hanging processes
- **Resource management**: Better error handling and cleanup

### Railway Configuration
```json
{
  "healthcheckTimeout": 600,
  "restartPolicyMaxRetries": 15,
  "numReplicas": 1
}
```

## Troubleshooting

### If Deployment Fails
1. Check Railway logs for specific errors
2. Verify yt-dlp is installed in the Docker container
3. Ensure all dependencies are in `package.json`

### If Health Check Fails
1. The `/health` endpoint should respond quickly
2. Check if the app is starting properly
3. Verify port configuration (Railway sets `PORT` env var)

### If Downloads Time Out
1. Downloads are limited to 5 minutes per track
2. Check if the track URL is accessible
3. Verify yt-dlp can access the content

## Environment Variables
Railway will automatically set:
- `PORT`: The port to listen on
- `NODE_ENV`: Set to "production"

## Monitoring
- Check Railway dashboard for logs and metrics
- Use `/health/detailed` for debugging yt-dlp issues
- Monitor memory usage in health check responses 