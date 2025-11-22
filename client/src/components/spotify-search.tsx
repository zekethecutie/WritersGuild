import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Music, Search, X, ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{
    id: string;
    name: string;
  }>;
  album: {
    id: string;
    name: string;
    images: Array<{
      url: string;
      height: number | null;
      width: number | null;
    }>;
  };
  external_urls: {
    spotify: string;
  };
  preview_url: string | null;
  duration_ms: number;
  popularity: number;
}

interface SpotifySearchProps {
  onTrackSelect: (track: SpotifyTrack) => void;
  selectedTrack?: SpotifyTrack | null;
  placeholder?: string;
  className?: string;
}

export function SpotifySearch({ onTrackSelect, selectedTrack, placeholder, className }: SpotifySearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: searchResults, isLoading } = useQuery({
    queryKey: ["/api/spotify/search", debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery.trim()) return { tracks: { items: [] } };

      const response = await fetch(`/api/spotify/search?q=${encodeURIComponent(debouncedQuery)}&limit=10`, {
        credentials: 'include'
      });
      if (!response.ok) {
        console.error('Spotify search failed:', response.status, response.statusText);
        return { tracks: { items: [] } };
      }
      const data = await response.json();
      console.log('Spotify search results:', data);
      return data;
    },
    enabled: !!debouncedQuery.trim(),
    retry: 1,
  });

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setShowResults(true);
  };

  const handleTrackSelect = (track: SpotifyTrack) => {
    onTrackSelect(track);
    setShowResults(false);
    setSearchQuery("");
  };

  const clearSelection = () => {
    setShowResults(false);
    setSearchQuery("");
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getAlbumArt = (track: SpotifyTrack) => {
    const image = track.album.images.find(img => img.height && img.height <= 300) || track.album.images[0];
    return image?.url;
  };

  return (
    <div className={`relative w-full ${className}`}>
      {/* Selected Track Display */}
      {selectedTrack && !showResults && (
        <Card className="mb-4 bg-gradient-to-r from-green-500/10 to-green-600/10 border-green-200 dark:border-green-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              {getAlbumArt(selectedTrack) && (
                <img
                  src={getAlbumArt(selectedTrack)}
                  alt={`${selectedTrack.album.name} album art`}
                  className="w-12 h-12 rounded object-cover flex-shrink-0"
                  data-testid="img-selected-spotify-track"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{selectedTrack.name}</p>
                <p className="text-sm text-muted-foreground truncate">
                  {selectedTrack.artists.map(artist => artist.name).join(", ")}
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(selectedTrack.external_urls.spotify, '_blank')}
                  className="p-2"
                  data-testid="button-open-spotify-track"
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSelection}
                  className="p-2"
                  data-testid="button-clear-spotify-track"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Input */}
      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 pointer-events-none" />
        <Input
          type="text"
          placeholder={placeholder || "Search Spotify tracks..."}
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => setShowResults(true)}
          className="pl-10 bg-card border-border w-full"
          data-testid="input-spotify-search"
        />
      </div>

      {/* Search Results - Dropdown */}
      {showResults && (searchQuery || isLoading) && (
        <>
          <div className="absolute top-full left-0 right-0 z-[9999] mt-1 bg-card border border-border rounded-md shadow-lg max-h-80 overflow-y-auto">
            {isLoading && (
              <div className="flex items-center justify-center py-4">
                <Music className="w-4 h-4 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">Searching...</span>
              </div>
            )}

            {!isLoading && searchResults?.tracks?.items?.length === 0 && searchQuery && (
              <div className="flex items-center justify-center py-4">
                <span className="text-sm text-muted-foreground">No songs found</span>
              </div>
            )}

            <div className="divide-y">
              {searchResults?.tracks?.items?.map((track: SpotifyTrack) => (
                <div
                  key={track.id}
                  className="flex items-center gap-3 p-3 hover:bg-muted cursor-pointer transition-colors"
                  onClick={() => handleTrackSelect(track)}
                  data-testid={`spotify-track-result-${track.id}`}
                >
                  {getAlbumArt(track) && (
                    <img
                      src={getAlbumArt(track)}
                      alt={`${track.album.name} album art`}
                      className="w-10 h-10 rounded object-cover flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{track.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {track.artists.map(artist => artist.name).join(", ")} • {track.album.name}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground flex-shrink-0">
                    {formatDuration(track.duration_ms)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Overlay to close results */}
          <div
            className="fixed inset-0 z-[9998]"
            onClick={() => setShowResults(false)}
          />
        </>
      )}
    </div>
  );
}