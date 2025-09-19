
import { Router } from "express";
import { getSpotifyClient } from "./spotifyClient";
import { isAuthenticated } from "./replitAuth";

const router = Router();

// Search for tracks, artists, albums, playlists
router.get("/search", isAuthenticated, async (req, res) => {
  try {
    const { q, type = 'track', limit = 10 } = req.query;
    
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    const spotify = await getSpotifyClient();
    const results = await spotify.search(q, [type as any], 'US', parseInt(limit as string));
    
    res.json(results);
  } catch (error) {
    console.error('Spotify search error:', error);
    res.status(500).json({ error: 'Failed to search Spotify' });
  }
});

// Get specific track
router.get("/track/:id", isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const spotify = await getSpotifyClient();
    const track = await spotify.tracks.get(id);
    
    res.json(track);
  } catch (error) {
    console.error('Get track error:', error);
    res.status(500).json({ error: 'Failed to get track' });
  }
});

// Get specific artist
router.get("/artist/:id", isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const spotify = await getSpotifyClient();
    const artist = await spotify.artists.get(id);
    
    res.json(artist);
  } catch (error) {
    console.error('Get artist error:', error);
    res.status(500).json({ error: 'Failed to get artist' });
  }
});

// Get specific album
router.get("/album/:id", isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const spotify = await getSpotifyClient();
    const album = await spotify.albums.get(id);
    
    res.json(album);
  } catch (error) {
    console.error('Get album error:', error);
    res.status(500).json({ error: 'Failed to get album' });
  }
});

// Get featured playlists
router.get("/featured-playlists", isAuthenticated, async (req, res) => {
  try {
    const spotify = await getSpotifyClient();
    const playlists = await spotify.browse.getFeaturedPlaylists('US', 20);
    
    res.json(playlists);
  } catch (error) {
    console.error('Get featured playlists error:', error);
    res.status(500).json({ error: 'Failed to get featured playlists' });
  }
});

// Get recommendations
router.get("/recommendations", isAuthenticated, async (req, res) => {
  try {
    const { seed_tracks, seed_artists, seed_genres } = req.query;
    const spotify = await getSpotifyClient();
    
    const recommendations = await spotify.recommendations.get({
      seed_tracks: seed_tracks ? (seed_tracks as string).split(',') : undefined,
      seed_artists: seed_artists ? (seed_artists as string).split(',') : undefined,
      seed_genres: seed_genres ? (seed_genres as string).split(',') : undefined,
      limit: 20,
    });
    
    res.json(recommendations);
  } catch (error) {
    console.error('Get recommendations error:', error);
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

// Get available genre seeds
router.get("/genres", isAuthenticated, async (req, res) => {
  try {
    const spotify = await getSpotifyClient();
    const genres = await spotify.recommendations.genreSeeds();
    
    res.json(genres);
  } catch (error) {
    console.error('Get genres error:', error);
    res.status(500).json({ error: 'Failed to get genres' });
  }
});

export default router;
