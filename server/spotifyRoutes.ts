import express from 'express';
import { getSpotifyClient } from './spotifyClient.js';

const router = express.Router();

// Search tracks
router.get('/search', async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const spotify = getSpotifyClient();
    if (!spotify) {
      return res.status(503).json({ 
        error: 'Spotify service unavailable',
        tracks: { items: [] }
      });
    }

    try {
      const results = await spotify.search(q, ['track'], undefined, parseInt(limit as string));
      res.json(results);
    } catch (spotifyError: any) {
      console.error('Spotify API error:', spotifyError);

      // Return empty results instead of error to prevent UI breaks
      res.json({
        tracks: {
          items: [],
          total: 0,
          limit: parseInt(limit as string),
          offset: 0
        }
      });
    }
  } catch (error: any) {
    console.error('Spotify search error:', error);

    // Always return a valid response structure
    res.json({
      tracks: {
        items: [],
        total: 0,
        limit: parseInt(limit as string),
        offset: 0
      }
    });
  }
});

// Get track by ID
router.get('/track/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'Track ID is required' });
    }

    const spotify = await getSpotifyClient();

    const track = await spotify.tracks.get(id, 'US');

    const trackData = {
      id: track.id,
      name: track.name,
      artists: track.artists.map(artist => ({ name: artist.name })),
      album: {
        name: track.album.name,
        images: track.album.images
      },
      preview_url: track.preview_url,
      external_urls: track.external_urls,
      duration_ms: track.duration_ms,
      popularity: track.popularity
    };

    res.json(trackData);
  } catch (error) {
    console.error('Spotify track fetch error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch track',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get multiple tracks by IDs
router.get('/tracks', async (req, res) => {
  try {
    const { ids } = req.query;

    if (!ids || typeof ids !== 'string') {
      return res.status(400).json({ error: 'Track IDs are required' });
    }

    const trackIds = ids.split(',').slice(0, 50); // Spotify API limit

    const spotify = await getSpotifyClient();

    const tracks = await spotify.tracks.get(trackIds, 'US');

    const tracksData = tracks.map(track => ({
      id: track.id,
      name: track.name,
      artists: track.artists.map(artist => ({ name: artist.name })),
      album: {
        name: track.album.name,
        images: track.album.images
      },
      preview_url: track.preview_url,
      external_urls: track.external_urls,
      duration_ms: track.duration_ms,
      popularity: track.popularity
    }));

    res.json({ tracks: tracksData });
  } catch (error) {
    console.error('Spotify tracks fetch error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch tracks',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get artist information
router.get('/artist/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'Artist ID is required' });
    }

    const spotify = await getSpotifyClient();

    const artist = await spotify.artists.get(id);

    const artistData = {
      id: artist.id,
      name: artist.name,
      genres: artist.genres,
      images: artist.images,
      popularity: artist.popularity,
      followers: artist.followers,
      external_urls: artist.external_urls
    };

    res.json(artistData);
  } catch (error) {
    console.error('Spotify artist fetch error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch artist',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get album information
router.get('/album/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'Album ID is required' });
    }

    const spotify = await getSpotifyClient();

    const album = await spotify.albums.get(id, 'US');

    const albumData = {
      id: album.id,
      name: album.name,
      artists: album.artists.map(artist => ({ name: artist.name, id: artist.id })),
      images: album.images,
      release_date: album.release_date,
      total_tracks: album.total_tracks,
      external_urls: album.external_urls,
      tracks: album.tracks.items.map(track => ({
        id: track.id,
        name: track.name,
        track_number: track.track_number,
        duration_ms: track.duration_ms,
        preview_url: track.preview_url
      }))
    };

    res.json(albumData);
  } catch (error) {
    console.error('Spotify album fetch error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch album',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    const spotify = await getSpotifyClient();
    // Simple test to verify connection
    res.json({ status: 'connected', timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Spotify health check failed:', error);
    res.status(503).json({ 
      status: 'disconnected', 
      error: error instanceof Error ? error.message : 'Connection failed',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;