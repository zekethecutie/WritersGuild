import { SpotifyApi } from "@spotify/web-api-ts-sdk";

let spotifyClient: SpotifyApi | null = null;
let connectionSettings: any = null;

export async function getSpotifyClient(): Promise<SpotifyApi> {
  if (spotifyClient && connectionSettings) {
    return spotifyClient;
  }

  try {
    // First try to get from Replit secrets
    const clientId = process.env.SPOTIFY_CLIENT_API || process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (clientId && clientSecret) {
      console.log('Using Spotify credentials from environment variables');

      spotifyClient = SpotifyApi.withClientCredentials(
        clientId,
        clientSecret
      );

      return spotifyClient;
    }

    // Fallback to Replit connector
    const hostname = process.env.REPL_SLUG ? `${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co` : 'localhost';
    const xReplitToken = process.env.REPLIT_DB_URL?.split('//')[1]?.split('@')[0] || '';

    if (!xReplitToken) {
      throw new Error('No Spotify credentials found. Please add SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET to your secrets.');
    }

    console.log('Attempting to fetch Spotify connection from Replit connector...');

    const response = await fetch(
      `https://${hostname}/api/v2/connection?include_secrets=true&connector_names=spotify`,
      {
        headers: {
          'Accept': 'application/json',
          'X_REPLIT_TOKEN': xReplitToken
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch Spotify connection: ${response.status}`);
    }

    const data = await response.json();
    connectionSettings = data.items?.[0];

    if (!connectionSettings || !connectionSettings.settings) {
      throw new Error('Spotify not connected via connector. Please connect Spotify in the Secrets/Connectors tab or add SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET to your secrets.');
    }

    const settings = connectionSettings.settings;

    if (!settings.client_id || !settings.client_secret) {
      throw new Error('Invalid Spotify connection settings');
    }

    console.log('Successfully retrieved Spotify connection from connector');

    spotifyClient = SpotifyApi.withClientCredentials(
      settings.client_id,
      settings.client_secret
    );

    return spotifyClient;

  } catch (error) {
    console.error('Spotify client initialization error:', error);
    throw new Error(`Failed to initialize Spotify client: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Helper function to refresh client if needed
export async function refreshSpotifyClient(): Promise<void> {
  spotifyClient = null;
  connectionSettings = null;
  await getSpotifyClient();
}