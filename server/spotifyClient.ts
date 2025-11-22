import { SpotifyApi } from "@spotify/web-api-ts-sdk";

let spotifyClient: SpotifyApi | null = null;
let connectionSettings: any = null;
let lastTokenFetch: number = 0;

async function getAccessToken() {
  // Refresh every 55 minutes to be safe (tokens expire in 1 hour)
  const now = Date.now();
  if (connectionSettings && lastTokenFetch && (now - lastTokenFetch) < 55 * 60 * 1000) {
    const expiresAt = connectionSettings?.settings?.oauth?.credentials?.expires_at;
    if (expiresAt && new Date(expiresAt).getTime() > now) {
      return connectionSettings.settings;
    }
  }

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!hostname || !xReplitToken) {
    console.warn('Replit connector env vars not found, Spotify connector may not be set up');
    const clientId = process.env.SPOTIFY_CLIENT_API || process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    
    if (clientId && clientSecret) {
      return { clientId, clientSecret };
    }
    throw new Error('No Spotify credentials found. Please set up Spotify connector or add SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET');
  }

  try {
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
    lastTokenFetch = now;

    if (!connectionSettings || !connectionSettings.settings) {
      throw new Error('Spotify not connected via connector');
    }

    return connectionSettings.settings;
  } catch (error) {
    console.error('Error fetching Spotify connection:', error);
    throw error;
  }
}

export async function getSpotifyClient(): Promise<SpotifyApi> {
  try {
    const settings = await getAccessToken();
    
    // Check if we have OAuth credentials from Replit connector
    if (settings.oauth?.credentials) {
      const credentials = settings.oauth.credentials;
      const clientId = credentials.client_id;
      const accessToken = credentials.access_token;
      const refreshToken = credentials.refresh_token;
      const expiresIn = credentials.expires_in || 3600;

      if (!clientId || !accessToken || !refreshToken) {
        throw new Error('Invalid Spotify OAuth credentials from connector');
      }

      console.log('Using Spotify credentials from Replit connector (OAuth)');
      
      const client = SpotifyApi.withAccessToken(clientId, {
        access_token: accessToken,
        token_type: "Bearer",
        expires_in: expiresIn,
        refresh_token: refreshToken,
      });

      return client;
    }

    // Fallback to client credentials (from environment variables)
    if (settings.clientId && settings.clientSecret) {
      console.log('Using Spotify Client Credentials from environment');
      
      const client = SpotifyApi.withClientCredentials(
        settings.clientId,
        settings.clientSecret
      );

      return client;
    }

    throw new Error('No valid Spotify credentials found');
  } catch (error) {
    console.error('Spotify client initialization error:', error);
    throw new Error(`Failed to initialize Spotify client: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Helper function to refresh client if needed
export async function refreshSpotifyClient(): Promise<void> {
  spotifyClient = null;
  connectionSettings = null;
  lastTokenFetch = 0;
  await getSpotifyClient();
}
