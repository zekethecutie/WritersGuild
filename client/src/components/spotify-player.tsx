import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { spotifyService, type SpotifyTrack } from "@/lib/spotify";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Play,
  Pause,
  Music,
  Search,
  X,
  Volume2,
  ExternalLink
} from "lucide-react";

interface SpotifyTrack {
  id: string;
  name: string;
  artists: { name: string }[];
  album: {
    name: string;
    images: { url: string }[];
  };
  preview_url: string | null;
  external_urls: {
    spotify: string;
  };
  duration_ms: number;
}

interface SpotifyPlayerProps {
  track?: any;
  onTrackSelect?: (track: SpotifyTrack) => void;
  onRemove?: () => void;
  onClose?: () => void;
  compact?: boolean;
  searchMode?: boolean;
}

export default function SpotifyPlayer({
  track,
  onTrackSelect,
  onRemove,
  onClose,
  compact = false,
  searchMode = false,
}: SpotifyPlayerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  const { data: searchResults, isLoading } = useQuery({
    queryKey: ["/api/spotify/search", searchQuery],
    queryFn: () => spotifyService.search(searchQuery, 'track', 10),
    enabled: searchQuery.length > 2 && searchMode,
  });

  useEffect(() => {
    return () => {
      spotifyService.stopPreview();
    };
  }, []);

  const handlePlayPause = (track: SpotifyTrack) => {
    if (!track.preview_url) return;

    const currentTrack = spotifyService.getCurrentTrack();
    const isCurrentlyPlaying = spotifyService.getIsPlaying();

    if (currentTrack?.id === track.id && isCurrentlyPlaying) {
      spotifyService.pausePreview();
      setIsPlaying(false);
    } else if (currentTrack?.id === track.id && !isCurrentlyPlaying) {
      spotifyService.resumePreview();
      setIsPlaying(true);
    } else {
      spotifyService.playPreview(track)
        .then(() => setIsPlaying(true))
        .catch((error) => {
          console.error("Error playing audio:", error);
          setIsPlaying(false);
        });
    }
  };

  const formatDuration = (ms: number) => {
    return spotifyService.formatDuration(ms);
  };

  // Search Mode UI
  if (searchMode) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-green-600 rounded flex items-center justify-center">
                <Music className="w-4 h-4 text-white" />
              </div>
              <h3 className="font-semibold">Add Music from Spotify</h3>
            </div>
            {onClose && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="p-1 h-auto"
                data-testid="button-close-spotify"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for songs..."
              className="pl-10 bg-input border-border focus:border-primary"
              data-testid="input-spotify-search"
            />
          </div>

          <ScrollArea className="h-64">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : searchResults?.tracks?.items?.length > 0 ? (
              <div className="space-y-2">
                {searchResults.tracks.items.map((track: SpotifyTrack) => (
                  <div
                    key={track.id}
                    className="flex items-center space-x-3 p-2 rounded-lg hover:bg-secondary/50 cursor-pointer transition-colors"
                    onClick={() => onTrackSelect?.(track)}
                    data-testid={`spotify-track-${track.id}`}
                  >
                    <img
                      src={spotifyService.getImageUrl(track.album.images, 'small')}
                      alt={track.album.name}
                      className="w-12 h-12 rounded object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{track.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {track.artists[0]?.name} • {track.album.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDuration(track.duration_ms)}
                      </p>
                    </div>
                    {track.preview_url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlayPause(track);
                        }}
                        className="p-2 text-green-500 hover:bg-green-500/10"
                        data-testid={`button-preview-${track.id}`}
                      >
                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : searchQuery.length > 2 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Music className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No tracks found</p>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Search for songs to add to your post</p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    );
  }

  // Display Mode UI
  if (!track) return null;

  return (
    <div className="spotify-player">
      <div className="flex items-center space-x-3">
        {track.image && (
          <img
            src={track.image}
            alt={track.album}
            className={`rounded object-cover ${compact ? "w-12 h-12" : "w-16 h-16"}`}
          />
        )}
        <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
          <Music className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`font-medium truncate ${compact ? "text-sm" : "text-base"}`}>
            {track.name}
          </p>
          <p className={`text-green-100/80 truncate ${compact ? "text-xs" : "text-sm"}`}>
            {track.artist} • {track.album?.name || track.album}
          </p>
          {!compact && (
            <div className="flex items-center space-x-2 mt-1">
              <Badge variant="outline" className="text-xs bg-white/20 border-white/30 text-white">
                Spotify
              </Badge>
              {track.external_urls?.spotify && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(track.external_urls.spotify, '_blank')}
                  className="p-1 h-auto text-green-100 hover:text-white hover:bg-white/20"
                  data-testid="button-open-spotify"
                >
                  <ExternalLink className="w-3 h-3" />
                </Button>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {track.preview_url && (
            <Button
              variant="ghost"
              size={compact ? "sm" : "default"}
              onClick={() => handlePlayPause(track.preview_url)}
              className="text-white hover:bg-white/20"
              data-testid="button-play-preview"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </Button>
          )}
          {!track.preview_url && (
            <div className="flex items-center text-xs text-green-100/60">
              <Volume2 className="w-4 h-4 mr-1" />
              Preview unavailable
            </div>
          )}
          {onRemove && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="p-1 h-auto text-green-100 hover:text-white hover:bg-white/20"
              data-testid="button-remove-spotify"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}