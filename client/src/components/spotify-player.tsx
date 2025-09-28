import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Music, ExternalLink, Play, Pause, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SpotifyTrackDisplay } from "@/components/spotify-track-display";
import { SpotifySearch } from "@/components/spotify-search";

interface SpotifyTrack {
  id: string;
  name: string;
  artist: string;
  album: string;
  image?: string;
  preview_url?: string;
  external_urls: {
    spotify: string;
  };
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
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !track?.preview_url) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [track?.preview_url]);

  const handlePlayPause = async () => {
    if (!track) return;

    if (!track.preview_url) {
      // Open Spotify directly as fallback
      window.open(track.external_urls.spotify, '_blank');
      toast({
        title: "Opening in Spotify 🎵", 
        description: "This track doesn't have a preview, so we're opening it in Spotify for you!",
      });
      return;
    }

    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      if (!audioRef.current || audioRef.current.src !== track.preview_url) {
        // Clean up old audio if exists
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }

        const newAudio = new Audio();

        // Set up event listeners before setting src
        newAudio.addEventListener('ended', () => {
          setIsPlaying(false);
        });

        newAudio.addEventListener('error', (e) => {
          console.error("Audio error:", e);
          setIsPlaying(false);
          toast({
            title: "Playback error 🎵",
            description: "Could not load this track preview. The audio file might be unavailable.",
            variant: "destructive",
          });
        });

        // Set crossOrigin to allow CORS
        newAudio.crossOrigin = "anonymous";
        newAudio.preload = "auto";
        newAudio.src = track.preview_url;

        audioRef.current = newAudio;
      }

      try {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          await playPromise;
          setIsPlaying(true);
        }
      } catch (error) {
        console.error("Audio play error:", error);
        setIsPlaying(false);

        if ((error as any).name === 'NotAllowedError') {
          toast({
            title: "Playback blocked 🎵",
            description: "Click anywhere on the page first, then try playing again.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Playback error 🎵",
            description: "Unable to play audio. Try opening in Spotify instead.",
            variant: "destructive",
          });
        }
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle search mode
  if (searchMode) {
    return (
      <div className="p-4 border rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Search Spotify</h3>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              ×
            </Button>
          )}
        </div>
        <SpotifySearch onTrackSelect={onTrackSelect} />
      </div>
    );
  }

  if (!track) return null;

  return (
    <SpotifyTrackDisplay
      track={track}
      size={size}
      showPreview={showPreview}
      className={className}
      onRemove={onRemove}
      onClose={onClose}
      onPlayPause={handlePlayPause}
      isPlaying={isPlaying}
      currentTime={currentTime}
      duration={duration}
      formatTime={formatTime}
      audioRef={audioRef}
      isLoading={isLoading}
      toast={toast}
    />
  );
}