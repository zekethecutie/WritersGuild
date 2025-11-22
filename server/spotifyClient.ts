import { SpotifyApi } from "@spotify/web-api-ts-sdk";

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings && connectionSettings.settings.oauth?.credentials?.expires_at) {
    const expiresAt = new Date(connectionSettings.settings.oauth.credentials.expires_at).getTime();
    if (expiresAt > Date.now()) {
      return {
        accessToken: connectionSettings.settings.oauth.credentials.access_token,
        clientId: connectionSettings.settings.oauth.credentials.client_id,
        refreshToken: connectionSettings.settings.oauth.credentials.refresh_token,
        expiresIn: connectionSettings.settings.oauth.credentials.expires_in || 3600
      };
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

  if (!connectionSettings || !connectionSettings.settings) {
    throw new Error('Spotify not connected via Replit connector');
  }

  const accessToken = connectionSettings.settings.oauth?.credentials?.access_token;
  const clientId = connectionSettings.settings.oauth?.credentials?.client_id;
  const refreshToken = connectionSettings.settings.oauth?.credentials?.refresh_token;
  const expiresIn = connectionSettings.settings.oauth?.credentials?.expires_in || 3600;

  if (!accessToken || !clientId || !refreshToken) {
    throw new Error('Invalid Spotify credentials from Replit connector');
  }

  return { accessToken, clientId, refreshToken, expiresIn };
}

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
// Always call this function again to get a fresh client.
export async function getSpotifyClient(): Promise<SpotifyApi> {
  try {
    console.log('🔍 Getting Spotify client from Replit connector...');
    const { accessToken, clientId, refreshToken, expiresIn } = await getAccessToken();

    console.log('✅ Using Spotify OAuth credentials from Replit connector');
    
    const spotify = SpotifyApi.withAccessToken(clientId, {
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: expiresIn,
      refresh_token: refreshToken,
    });

    return spotify;
  } catch (error) {
    console.error('❌ Spotify client initialization error:', error);
    console.error('To fix this: Make sure Spotify is connected via the Replit connector');
    throw new Error(`Failed to initialize Spotify client: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Helper function to refresh connection settings
export async function refreshSpotifyClient(): Promise<void> {
  connectionSettings = null;
}
