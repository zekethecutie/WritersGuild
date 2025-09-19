
export interface SpotifyTrack {
  id: string;
  name: string;
  artists: { name: string; id: string }[];
  album: {
    name: string;
    images: { url: string; width: number; height: number }[];
    id: string;
  };
  preview_url: string | null;
  external_urls: {
    spotify: string;
  };
  duration_ms: number;
  popularity: number;
  explicit: boolean;
  uri: string;
}

export interface SpotifyArtist {
  id: string;
  name: string;
  images: { url: string; width: number; height: number }[];
  external_urls: {
    spotify: string;
  };
  genres: string[];
  popularity: number;
  followers: {
    total: number;
  };
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  artists: { name: string; id: string }[];
  images: { url: string; width: number; height: number }[];
  external_urls: {
    spotify: string;
  };
  release_date: string;
  total_tracks: number;
  uri: string;
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string;
  images: { url: string; width: number; height: number }[];
  external_urls: {
    spotify: string;
  };
  owner: {
    display_name: string;
    id: string;
  };
  tracks: {
    total: number;
  };
  public: boolean;
  uri: string;
}

export interface SpotifySearchResults {
  tracks?: {
    items: SpotifyTrack[];
    total: number;
  };
  artists?: {
    items: SpotifyArtist[];
    total: number;
  };
  albums?: {
    items: SpotifyAlbum[];
    total: number;
  };
  playlists?: {
    items: SpotifyPlaylist[];
    total: number;
  };
}

export class SpotifyService {
  private static instance: SpotifyService;
  private audioPlayer: HTMLAudioElement | null = null;
  private currentTrack: SpotifyTrack | null = null;
  private isPlaying = false;

  public static getInstance(): SpotifyService {
    if (!SpotifyService.instance) {
      SpotifyService.instance = new SpotifyService();
    }
    return SpotifyService.instance;
  }

  async search(
    query: string, 
    type: 'track' | 'artist' | 'album' | 'playlist' = 'track',
    limit = 10
  ): Promise<SpotifySearchResults> {
    try {
      const response = await fetch(
        `/api/spotify/search?q=${encodeURIComponent(query)}&type=${type}&limit=${limit}`
      );
      
      if (!response.ok) {
        throw new Error(`Spotify search failed: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Spotify search error:', error);
      throw error;
    }
  }

  async getTrack(trackId: string): Promise<SpotifyTrack> {
    try {
      const response = await fetch(`/api/spotify/track/${trackId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to get track: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Get track error:', error);
      throw error;
    }
  }

  async getArtist(artistId: string): Promise<SpotifyArtist> {
    try {
      const response = await fetch(`/api/spotify/artist/${artistId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to get artist: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Get artist error:', error);
      throw error;
    }
  }

  async getAlbum(albumId: string): Promise<SpotifyAlbum> {
    try {
      const response = await fetch(`/api/spotify/album/${albumId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to get album: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Get album error:', error);
      throw error;
    }
  }

  async getFeaturedPlaylists(): Promise<{ playlists: { items: SpotifyPlaylist[] } }> {
    try {
      const response = await fetch('/api/spotify/featured-playlists');
      
      if (!response.ok) {
        throw new Error(`Failed to get featured playlists: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Get featured playlists error:', error);
      throw error;
    }
  }

  async getRecommendations(seedTracks?: string[], seedArtists?: string[], seedGenres?: string[]): Promise<{ tracks: SpotifyTrack[] }> {
    try {
      const params = new URLSearchParams();
      if (seedTracks?.length) params.append('seed_tracks', seedTracks.join(','));
      if (seedArtists?.length) params.append('seed_artists', seedArtists.join(','));
      if (seedGenres?.length) params.append('seed_genres', seedGenres.join(','));
      
      const response = await fetch(`/api/spotify/recommendations?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Failed to get recommendations: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Get recommendations error:', error);
      throw error;
    }
  }

  // Audio player methods
  playPreview(track: SpotifyTrack): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!track.preview_url) {
        reject(new Error('No preview available for this track'));
        return;
      }

      this.stopPreview();

      this.audioPlayer = new Audio(track.preview_url);
      this.currentTrack = track;

      this.audioPlayer.addEventListener('ended', () => {
        this.isPlaying = false;
        this.currentTrack = null;
      });

      this.audioPlayer.addEventListener('error', () => {
        this.isPlaying = false;
        this.currentTrack = null;
        reject(new Error('Failed to play audio'));
      });

      this.audioPlayer.play()
        .then(() => {
          this.isPlaying = true;
          resolve();
        })
        .catch(reject);
    });
  }

  stopPreview(): void {
    if (this.audioPlayer) {
      this.audioPlayer.pause();
      this.audioPlayer.src = '';
      this.audioPlayer = null;
    }
    this.isPlaying = false;
    this.currentTrack = null;
  }

  pausePreview(): void {
    if (this.audioPlayer) {
      this.audioPlayer.pause();
      this.isPlaying = false;
    }
  }

  resumePreview(): void {
    if (this.audioPlayer) {
      this.audioPlayer.play();
      this.isPlaying = true;
    }
  }

  getCurrentTrack(): SpotifyTrack | null {
    return this.currentTrack;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  formatDuration(ms: number): string {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  getImageUrl(images: { url: string; width: number; height: number }[], size: 'small' | 'medium' | 'large' = 'medium'): string {
    if (!images.length) return '';
    
    const sortedImages = images.sort((a, b) => (b.width || 0) - (a.width || 0));
    
    switch (size) {
      case 'small':
        return sortedImages[sortedImages.length - 1]?.url || sortedImages[0]?.url || '';
      case 'large':
        return sortedImages[0]?.url || '';
      case 'medium':
      default:
        return sortedImages[Math.floor(sortedImages.length / 2)]?.url || sortedImages[0]?.url || '';
    }
  }
}

export const spotifyService = SpotifyService.getInstance();
