import { SpotifyApi } from "@spotify/web-api-ts-sdk";

let spotifyClient: SpotifyApi | null = null;
let connectionSettings: any = null;
let lastTokenFetch: number = 0;

async function getAccessTokenFromConnector() {
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
    throw new Error('Replit connector environment variables not available');
  }

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
  lastTokenFetch = Date.now();

  if (!connectionSettings || !connectionSettings.settings) {
    throw new Error('Spotify not connected via Replit connector');
  }

  return connectionSettings.settings;
}

export async function getSpotifyClient(): Promise<SpotifyApi> {
  try {
    // First priority: Check for environment variables (like DATABASE_URL)
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    console.log('🔍 Spotify credentials check:');
    console.log('  SPOTIFY_CLIENT_ID:', clientId ? `[${clientId.substring(0, 8)}...]` : 'NOT SET');
    console.log('  SPOTIFY_CLIENT_SECRET:', clientSecret ? '[SET]' : 'NOT SET');

    if (clientId && clientSecret) {
      console.log('✅ Using Spotify Client Credentials from environment variables');
      
      try {
        const client = SpotifyApi.withClientCredentials(clientId, clientSecret);
        console.log('✅ Spotify client created successfully');
        return client;
      } catch (initError) {
        console.error('❌ Error initializing Spotify client:', initError);
        throw initError;
      }
    }

    // Second priority: Try Replit connector
    console.log('⚠️ SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET not found in environment, trying Replit connector...');
    const settings = await getAccessTokenFromConnector();
    
    if (settings.oauth?.credentials) {
      const credentials = settings.oauth.credentials;
      const connectorClientId = credentials.client_id;
      const accessToken = credentials.access_token;
      const refreshToken = credentials.refresh_token;
      const expiresIn = credentials.expires_in || 3600;

      if (!connectorClientId || !accessToken || !refreshToken) {
        throw new Error('Invalid Spotify OAuth credentials from Replit connector');
      }

      console.log('✅ Using Spotify OAuth credentials from Replit connector');
      
      const client = SpotifyApi.withAccessToken(connectorClientId, {
        access_token: accessToken,
        token_type: "Bearer",
        expires_in: expiresIn,
        refresh_token: refreshToken,
      });

      return client;
    }

    throw new Error('No valid Spotify credentials found');
  } catch (error) {
    console.error('❌ Spotify client initialization error:', error);
    console.error('To fix this, either:');
    console.error('1. Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET as secrets');
    console.error('2. OR connect Spotify via the Replit connectors');
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
