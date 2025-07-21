# Use Node.js 18 as base image
FROM node:18-slim

# Set working directory
WORKDIR /app

# Install system dependencies including Python and pip
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    curl \
    wget \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Copy package files first for better caching
COPY package*.json ./

# Install Node.js dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy application files
COPY . .

# Install yt-dlp using multiple methods for redundancy
RUN echo "=== INSTALLING YT-DLP WITH MULTIPLE FALLBACKS ===" && \
    # Method 1: Direct binary download
    echo "Method 1: Downloading yt-dlp binary..." && \
    curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o ./yt-dlp && \
    chmod +x ./yt-dlp && \
    cp ./yt-dlp /usr/local/bin/yt-dlp 2>/dev/null || echo "Cannot copy to /usr/local/bin" && \
    cp ./yt-dlp node_modules/.bin/yt-dlp 2>/dev/null || mkdir -p node_modules/.bin && cp ./yt-dlp node_modules/.bin/yt-dlp && \
    # Method 2: Try pip installation as backup
    echo "Method 2: Trying pip installation..." && \
    python3 -m pip install --user yt-dlp 2>/dev/null || echo "Pip installation failed" && \
    # Method 3: Try apt installation
    echo "Method 3: Trying apt installation..." && \
    apt-get update && apt-get install -y yt-dlp 2>/dev/null || echo "Apt installation failed" && \
    # Verification
    echo "=== VERIFICATION ===" && \
    echo "Current directory: $(pwd)" && \
    echo "Files in current dir: $(ls -la | head -10)" && \
    echo "Testing ./yt-dlp: $(./yt-dlp --version 2>/dev/null || echo 'FAILED')" && \
    echo "Testing yt-dlp in PATH: $(yt-dlp --version 2>/dev/null || echo 'FAILED')" && \
    echo "Which yt-dlp: $(which yt-dlp || echo 'NOT FOUND')" && \
    echo "PATH is: $PATH"

# Create necessary directories and set permissions
RUN mkdir -p /app/downloads && \
    chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PATH="/app/node_modules/.bin:/app:/home/appuser/.local/bin:/usr/local/bin:$PATH"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Start the application
CMD ["npm", "start"] 