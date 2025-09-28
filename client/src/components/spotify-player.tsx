import React from "react";
import { SpotifyTrackDisplay } from "@/components/spotify-track-display";
import { SpotifySearch } from "@/components/spotify-search";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

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

interface SpotifyPlayerProps {
  track?: SpotifyTrack | null;
  size?: "sm" | "md" | "lg";
  showPreview?: boolean;
  className?: string;
  onRemove?: () => void;
  onTrackSelect?: (track: SpotifyTrack) => void;
  onClose?: () => void;
  searchMode?: boolean;
  compact?: boolean;
}

export default function SpotifyPlayer({ 
  track, 
  size = "md", 
  showPreview = true, 
  className,
  onRemove,
  onTrackSelect,
  onClose,
  searchMode = false,
  compact = false
}: SpotifyPlayerProps) {

  // Handle search mode
  if (searchMode) {
    return (
      <div className="p-4 border rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Search Spotify</h3>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
        <SpotifySearch 
          onTrackSelect={onTrackSelect || (() => {})}
          selectedTrack={track}
        />
      </div>
    );
  }

  if (!track) return null;

  return (
    <div className={className}>
      <SpotifyTrackDisplay
        track={track}
        size={size}
        showPreview={showPreview}
      />
      {onRemove && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="mt-2 text-muted-foreground hover:text-destructive"
        >
          <X className="w-4 h-4 mr-2" />
          Remove track
        </Button>
      )}
    </div>
  );
}