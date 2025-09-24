import { SpotifyApi } from "@spotify/web-api-ts-sdk";

let connectionSettings: any;

async function getAccessToken() {
  // Try environment variables first
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  
  if (clientId && clientSecret) {
    // Use client credentials flow for app-only access
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
      },
      body: 'grant_type=client_credentials'
    });

    if (response.ok) {
      const data = await response.json();
      return {
        accessToken: data.access_token,
        clientId,
        refreshToken: null,
        expiresIn: data.expires_in
      };
    }
  }

  // Fallback to Replit connector if environment variables not set
  if (connectionSettings && connectionSettings.settings?.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return {
      accessToken: connectionSettings.settings.access_token,
      clientId: connectionSettings.settings.oauth?.credentials?.client_id,
      refreshToken: connectionSettings.settings.oauth?.credentials?.refresh_token,
      expiresIn: connectionSettings.settings.oauth?.credentials?.expires_in
    };
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!hostname || !xReplitToken) {
    throw new Error('Spotify credentials not found. Please set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET environment variables, or connect Spotify via Replit connector.');
  }

  try {
    const response = await fetch(
      'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=spotify',
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
      throw new Error('Spotify not connected via Replit connector. Please connect Spotify in the Secrets/Connectors tab.');
    }

    const refreshToken = connectionSettings.settings.oauth?.credentials?.refresh_token;
    const accessToken = connectionSettings.settings.access_token || connectionSettings.settings.oauth?.credentials?.access_token;
    const connectorClientId = connectionSettings.settings.oauth?.credentials?.client_id;
    const expiresIn = connectionSettings.settings.oauth?.credentials?.expires_in;
    
    if (!accessToken || !connectorClientId) {
      throw new Error('Invalid Spotify connection settings. Please reconnect Spotify in the Secrets/Connectors tab.');
    }
    
    return {accessToken, clientId: connectorClientId, refreshToken, expiresIn};
  } catch (error) {
    console.error('Error fetching Spotify connection:', error);
    throw new Error('Failed to connect to Spotify. Please check your Spotify connection in the Secrets/Connectors tab or set environment variables.');
  }
}

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
// Always call this function again to get a fresh client.
export async function getSpotifyClient() {
  const {accessToken, clientId, refreshToken, expiresIn} = await getAccessToken();

  const spotify = SpotifyApi.withAccessToken(clientId, {
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: expiresIn || 3600,
    refresh_token: refreshToken,
  });

  return spotify;
}

// Convenience function for consistent usage throughout the app
export { getSpotifyClient as getUncachableSpotifyClient };
