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
      if (!debouncedQuery.trim()) return { tracks: [] };
      
      const response = await fetch(`/api/spotify/search?q=${encodeURIComponent(debouncedQuery)}&limit=10`);
      if (!response.ok) {
        throw new Error("Failed to search tracks");
      }
      return response.json();
    },
    enabled: !!debouncedQuery.trim(),
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
    onTrackSelect(null as any);
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
    <div className={`relative ${className}`}>
      {/* Selected Track Display */}
      {selectedTrack && !showResults && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              {getAlbumArt(selectedTrack) && (
                <img
                  src={getAlbumArt(selectedTrack)}
                  alt={`${selectedTrack.album.name} album art`}
                  className="w-12 h-12 rounded object-cover"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{selectedTrack.name}</p>
                <p className="text-sm text-muted-foreground truncate">
                  {selectedTrack.artists.map(artist => artist.name).join(", ")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(selectedTrack.external_urls.spotify, '_blank')}
                  className="p-2"
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSelection}
                  className="p-2"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          type="text"
          placeholder={placeholder || "Search for a song..."}
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => setShowResults(true)}
          className="pl-10"
        />
      </div>

      {/* Search Results */}
      {showResults && (searchQuery || isLoading) && (
        <Card className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border shadow-lg">
          <ScrollArea className="max-h-80">
            <div className="p-2">
              {isLoading && (
                <div className="flex items-center justify-center py-4">
                  <Music className="w-4 h-4 animate-spin mr-2" />
                  <span className="text-sm text-muted-foreground">Searching...</span>
                </div>
              )}

              {!isLoading && searchResults?.tracks?.length === 0 && searchQuery && (
                <div className="flex items-center justify-center py-4">
                  <span className="text-sm text-muted-foreground">No songs found</span>
                </div>
              )}

              {searchResults?.tracks?.map((track: SpotifyTrack) => (
                <div
                  key={track.id}
                  className="flex items-center gap-3 p-2 hover:bg-muted rounded cursor-pointer"
                  onClick={() => handleTrackSelect(track)}
                >
                  {getAlbumArt(track) && (
                    <img
                      src={getAlbumArt(track)}
                      alt={`${track.album.name} album art`}
                      className="w-10 h-10 rounded object-cover"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{track.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {track.artists.map(artist => artist.name).join(", ")} • {track.album.name}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDuration(track.duration_ms)}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>
      )}

      {/* Overlay to close results */}
      {showResults && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowResults(false)}
        />
      )}
    </div>
  );
}