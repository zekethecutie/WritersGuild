
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  Search,
  Music,
  Play,
  Pause,
  X,
  ExternalLink,
  Clock
} from "lucide-react";

interface SpotifyTrack {
  id: string;
  name: string;
  artists: { name: string }[];
  album: {
    name: string;
    images: { url: string; width: number; height: number }[];
  };
  preview_url: string | null;
  external_urls: {
    spotify: string;
  };
  duration_ms: number;
  explicit: boolean;
}

interface SpotifyPlayerProps {
  track?: SpotifyTrack;
  onTrackSelect?: (track: SpotifyTrack) => void;
  onRemove?: () => void;
  onClose?: () => void;
  searchMode?: boolean;
  compact?: boolean;
}

export default function SpotifyPlayer({
  track,
  onTrackSelect,
  onRemove,
  onClose,
  searchMode = false,
  compact = false
}: SpotifyPlayerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Search for tracks
  const { data: searchResults, isLoading: isSearching, error: searchError } = useQuery({
    queryKey: ["/api/spotify/search", debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery.trim()) return { tracks: { items: [] } };
      
      try {
        const response = await fetch(`/api/spotify/search?q=${encodeURIComponent(debouncedQuery)}&type=track&limit=20`, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Spotify authentication required');
          }
          if (response.status === 404) {
            throw new Error('Spotify service not available');
          }
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Search failed: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Comprehensive validation
        if (!data || typeof data !== 'object') {
          throw new Error('Invalid response format');
        }
        
        const tracks = data.tracks?.items || [];
        
        // Validate each track
        const validTracks = tracks.filter((track: any) => {
          return track && 
                 track.id && 
                 track.name && 
                 Array.isArray(track.artists) && 
                 track.album && 
                 track.album.name;
        });
        
        return {
          tracks: {
            items: validTracks
          }
        };
      } catch (error) {
        console.error('Spotify search error:', error);
        throw error;
      }
    },
    enabled: !!debouncedQuery.trim(),
    retry: (failureCount, error) => {
      // Don't retry auth errors
      if (error?.message?.includes('authentication')) {
        return false;
      }
      return failureCount < 2;
    },
  });

  const tracks = searchResults?.tracks?.items || [];

  const playPreview = async (trackToPlay: SpotifyTrack) => {
    if (!trackToPlay.preview_url) return;

    // Stop current audio
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.src = '';
    }

    if (playingTrackId === trackToPlay.id) {
      setIsPlaying(false);
      setPlayingTrackId(null);
      setCurrentAudio(null);
      return;
    }

    try {
      const audio = new Audio(trackToPlay.preview_url);
      
      audio.addEventListener('ended', () => {
        setIsPlaying(false);
        setPlayingTrackId(null);
        setCurrentAudio(null);
      });

      audio.addEventListener('error', (e) => {
        console.error('Audio error:', e);
        setIsPlaying(false);
        setPlayingTrackId(null);
        setCurrentAudio(null);
      });

      // Set loading state immediately to prevent double-clicks
      setPlayingTrackId(trackToPlay.id);
      setIsPlaying(false);

      await audio.play();
      setCurrentAudio(audio);
      setIsPlaying(true);
    } catch (error) {
      console.error('Failed to play preview:', error);
      // Reset state on error
      setIsPlaying(false);
      setPlayingTrackId(null);
      setCurrentAudio(null);
    }
  };

  const stopPreview = () => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.src = '';
      setCurrentAudio(null);
    }
    setIsPlaying(false);
    setPlayingTrackId(null);
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getImageUrl = (images: { url: string; width: number; height: number }[]) => {
    if (!images || !Array.isArray(images) || !images.length) return '';
    
    try {
      const sortedImages = images
        .filter(img => img && img.url) // Filter out invalid entries
        .sort((a, b) => (b.width || 0) - (a.width || 0));
      
      return sortedImages[0]?.url || '';
    } catch (error) {
      console.error('Error processing image URL:', error);
      return '';
    }
  };

  useEffect(() => {
    return () => {
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.src = '';
      }
    };
  }, [currentAudio]);

  // If showing a selected track in compact mode
  if (compact && track) {
    return (
      <Card className="bg-gradient-to-r from-green-500/10 to-green-600/10 border-green-500/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <img
              src={getImageUrl(track.album.images)}
              alt={track.album.name}
              className="w-12 h-12 rounded-lg object-cover bg-muted"
              onError={(e) => {
                e.currentTarget.src = '';
                e.currentTarget.style.display = 'none';
              }}
            />
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm truncate">{track.name}</h4>
              <p className="text-xs text-muted-foreground truncate">
                by {track.artists.map(a => a.name).join(', ')}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {track.album.name}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {track.preview_url && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => playPreview(track)}
                  className="h-8 w-8 p-0"
                >
                  {playingTrackId === track.id && isPlaying ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={onRemove}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Search mode UI
  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Music className="w-5 h-5 text-green-500" />
            Add Music from Spotify
          </CardTitle>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for songs, artists, or albums..."
            className="pl-10"
          />
        </div>

        <ScrollArea className="h-96 w-full">
          {isSearching && debouncedQuery && (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
              <span className="ml-2 text-sm text-muted-foreground">Searching...</span>
            </div>
          )}

          {!debouncedQuery && !isSearching && (
            <div className="text-center py-8 text-muted-foreground">
              <Music className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Search for music to add to your post</p>
            </div>
          )}

          {searchError && (
            <div className="text-center py-8 text-red-500">
              <p className="text-sm">
                {searchError.message?.includes('authentication') 
                  ? 'Spotify authentication required. Please check your settings.' 
                  : 'Search failed. Please try again.'}
              </p>
            </div>
          )}

          {debouncedQuery && !isSearching && !searchError && tracks.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No tracks found</p>
            </div>
          )}

          <div className="space-y-2">
            {tracks.map((trackItem: SpotifyTrack) => {
              // Validate track data
              if (!trackItem || !trackItem.id || !trackItem.name || !trackItem.artists) {
                return null;
              }
              
              return (
              <div
                key={trackItem.id}
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <img
                  src={getImageUrl(trackItem.album.images)}
                  alt={trackItem.album.name}
                  className="w-12 h-12 rounded-lg object-cover bg-muted flex-shrink-0"
                  onError={(e) => {
                    e.currentTarget.src = '';
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm truncate">
                    {trackItem.name}
                    {trackItem.explicit && (
                      <Badge variant="secondary" className="ml-2 text-xs">E</Badge>
                    )}
                  </h4>
                  <p className="text-xs text-muted-foreground truncate">
                    by {trackItem.artists.map(a => a.name).join(', ')}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {trackItem.album.name}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {formatDuration(trackItem.duration_ms)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {trackItem.preview_url && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => playPreview(trackItem)}
                      className="h-8 w-8 p-0"
                      title="Play preview"
                    >
                      {playingTrackId === trackItem.id && isPlaying ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(trackItem.external_urls.spotify, '_blank')}
                    className="h-8 w-8 p-0"
                    title="Open in Spotify"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => {
                      onTrackSelect?.(trackItem);
                      stopPreview();
                    }}
                    className="text-xs px-3"
                  >
                    Select
                  </Button>
                </div>
              </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
