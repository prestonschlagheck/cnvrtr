const { create: createYoutubeDl } = require('youtube-dl-exec');

// Create youtube-dl instance - Vercel will handle the binary
const youtubedl = createYoutubeDl();

module.exports = async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { url } = req.body;
        
        if (!url || !url.includes('soundcloud.com')) {
            return res.status(400).json({ error: 'Invalid SoundCloud URL' });
        }

        console.log('Fetching playlist info for:', url);
        
        // Check if it's a playlist/set URL
        const isPlaylist = url.includes('/sets/');
        
        let info;
        
        if (isPlaylist) {
            // Get playlist information with flat extraction
            try {
                info = await youtubedl(url, {
                    flatPlaylist: true,
                    dumpSingleJson: true,
                    noWarnings: true
                });
                
                // If we don't get entries, try a different approach
                if (!info || !info.entries) {
                    console.log('Trying alternative playlist extraction method...');
                    info = await youtubedl(url, {
                        extractFlat: 'in_playlist',
                        dumpSingleJson: true,
                        noWarnings: true,
                        noCheckCertificates: true
                    });
                }
            } catch (playlistError) {
                console.error('Playlist error:', playlistError);
                return res.status(500).json({ 
                    error: 'Failed to access SoundCloud playlist. Please check the URL and ensure the playlist is public.',
                    details: playlistError.message || 'Unknown error occurred while fetching playlist'
                });
            }
        } else {
            // Single track - get its info and treat as a single-item playlist
            console.log('Processing single track URL:', url);
            info = await youtubedl(url, {
                dumpSingleJson: true,
                noWarnings: true,
                noCheckCertificates: true
            });
        }

        // Debug: Log the structure we get from yt-dlp
        if (info) {
            const infoStr = JSON.stringify(info, null, 2);
            console.log('Raw info received:', infoStr.length > 1000 ? infoStr.substring(0, 1000) + '...' : infoStr);
        } else {
            console.log('No info received from yt-dlp');
        }

        // Handle playlist response
        if (info && info.entries) {
            const tracks = info.entries.map((entry, index) => ({
                id: entry.id || entry.ie_key + '_' + index,
                title: entry.title || `Track ${index + 1}`,
                uploader: entry.uploader || entry.uploader_id || info.uploader || 'Unknown',
                duration: entry.duration || null,
                url: entry.url || entry.webpage_url || entry.original_url,
                thumbnail: entry.thumbnail || (entry.thumbnails && entry.thumbnails[0] ? entry.thumbnails[0].url : null)
            })).filter(track => track.url); // Only include tracks with valid URLs

            // If we have track URLs but no proper titles, fetch detailed metadata for ALL tracks
            const needsDetailedInfo = tracks.some(track => track.title.startsWith('Track '));
            
            if (needsDetailedInfo && tracks.length <= 50) { // Limit to 50 tracks for performance
                console.log(`Fetching detailed track information for ${tracks.length} tracks...`);
                try {
                    // Fetch detailed info for ALL tracks to get proper titles
                    const detailedTracks = await Promise.all(
                        tracks.map(async (track, index) => {
                            try {
                                console.log(`Fetching details for track ${index + 1}/${tracks.length}...`);
                                const trackInfo = await youtubedl(track.url, {
                                    dumpSingleJson: true,
                                    noWarnings: true,
                                    noCheckCertificates: true
                                });
                                return {
                                    ...track,
                                    title: trackInfo.title || track.title,
                                    uploader: trackInfo.uploader || track.uploader,
                                    duration: trackInfo.duration || track.duration,
                                    thumbnail: trackInfo.thumbnail || track.thumbnail
                                };
                            } catch (e) {
                                console.error(`Failed to get details for track ${index + 1}:`, e.message);
                                return track; // Return original track if detailed fetch fails
                            }
                        })
                    );
                    
                    // Replace all tracks with detailed info
                    tracks.splice(0, tracks.length, ...detailedTracks);
                    console.log('Finished fetching detailed track information.');
                } catch (error) {
                    console.error('Error fetching detailed track info:', error);
                }
            }

            res.json({
                title: info.title || info.playlist_title || 'SoundCloud Playlist',
                uploader: info.uploader || info.playlist_uploader || 'Unknown',
                tracks: tracks,
                playlist_count: info.playlist_count || tracks.length
            });
        } 
        // Handle single track response
        else if (info && info.title) {
            res.json({
                title: `Single Track: ${info.title}`,
                uploader: info.uploader,
                tracks: [{
                    id: info.id,
                    title: info.title,
                    uploader: info.uploader,
                    duration: info.duration,
                    url: info.webpage_url || url,
                    thumbnail: info.thumbnail
                }]
            });
        } else {
            return res.status(400).json({ error: 'No track information found' });
        }

    } catch (error) {
        console.error('Error fetching playlist info:', error);
        
        let errorMessage = 'Failed to fetch track information';
        if (error.message && error.message.includes('404')) {
            errorMessage = 'Track or playlist not found. Please check the URL and ensure it is publicly accessible.';
        } else if (error.message && error.message.includes('HTTP Error')) {
            errorMessage = 'SoundCloud access error. The content may be restricted or private.';
        }
        
        res.status(500).json({ 
            error: errorMessage,
            details: 'Try using individual track URLs instead of playlist URLs if this continues.'
        });
    }
} 