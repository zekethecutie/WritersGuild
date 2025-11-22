import { SpotifyApi } from "@spotify/web-api-ts-sdk";

export async function getSpotifyClient(): Promise<SpotifyApi> {
  try {
    // Use manual credentials from environment variables
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET environment variables are required');
    }

    console.log('🔍 Initializing Spotify with Client Credentials...');
    console.log('  Client ID:', clientId.substring(0, 8) + '...');
    
    const spotify = SpotifyApi.withClientCredentials(clientId, clientSecret);
    
    console.log('✅ Spotify client initialized successfully with Client Credentials');
    return spotify;
  } catch (error) {
    console.error('❌ Spotify client initialization error:', error);
    throw error;
  }
}
