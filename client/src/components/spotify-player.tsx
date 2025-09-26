import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Music, ExternalLink, Play, Pause, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
        <p className="text-muted-foreground text-center py-8">
          Spotify search functionality would be implemented here.
        </p>
      </div>
    );
  }

  if (!track) return null;

  const sizeClasses = {
    sm: {
      container: "p-3",
      image: "w-10 h-10",
      title: "text-sm",
      artist: "text-xs",
      icon: "w-4 h-4",
    },
    md: {
      container: "p-4",
      image: "w-12 h-12",
      title: "text-sm",
      artist: "text-sm",
      icon: "w-4 h-4",
    },
    lg: {
      container: "p-6",
      image: "w-16 h-16",
      title: "text-base",
      artist: "text-sm",
      icon: "w-5 h-5",
    },
  };

  const classes = sizeClasses[size];

  return (
    <Card className={`bg-gradient-to-r from-green-500/10 to-green-600/10 border-green-200 dark:border-green-800 ${className}`}>
      <CardContent className={classes.container}>
        <div className="flex items-center gap-3">
          {/* Album Art or Music Icon */}
          {track.image ? (
            <img
              src={track.image}
              alt={`${track.album} album art`}
              className={`${classes.image} rounded object-cover`}
            />
          ) : (
            <div className={`${classes.image} bg-green-100 dark:bg-green-900 rounded flex items-center justify-center`}>
              <Music className={`${classes.icon} text-green-600 dark:text-green-400`} />
            </div>
          )}

          {/* Track Info */}
          <div className="flex-1 min-w-0">
            <p className={`font-medium ${classes.title}`} style={{
              whiteSpace: 'normal',
              wordBreak: 'break-word',
              overflow: 'visible',
              textOverflow: 'clip',
              lineHeight: '1.6',
              minHeight: '1.6em',
              paddingBottom: '2px'
            }}>
              {track.name}
            </p>
            <p className={`text-muted-foreground ${classes.artist}`} style={{
              whiteSpace: 'normal',
              wordBreak: 'break-word',
              overflow: 'visible',
              textOverflow: 'clip',
              lineHeight: '1.5',
              minHeight: '1.5em',
              paddingBottom: '2px'
            }}>
              {track.artist}
            </p>
            {size !== "sm" && (
              <p className="text-xs text-muted-foreground" style={{
                whiteSpace: 'normal',
                wordBreak: 'break-word',
                overflow: 'visible',
                textOverflow: 'clip',
                lineHeight: '1.4',
                minHeight: '1.4em',
                paddingBottom: '2px'
              }}>
                {track.album}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1">
            {showPreview && track.preview_url && (
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  onClick={handlePlayPause}
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 hover:bg-white/20"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : isPlaying ? (
                    <Pause className="h-4 w-4 text-white" />
                  ) : (
                    <Play className="h-4 w-4 text-white" />
                  )}
                </Button>
                {duration > 0 && !isLoading && (
                  <span className="text-xs text-muted-foreground min-w-[3rem]">
                    {formatTime(currentTime)}/{formatTime(duration)}
                  </span>
                )}
                <audio
                  ref={audioRef}
                  src={track.preview_url || ""}
                  preload="metadata"
                />
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(track.external_urls.spotify, '_blank')}
              className="p-2"
              title="Open in Spotify"
            >
              <ExternalLink className={classes.icon} />
            </Button>

            {/* Remove button for compact mode */}
            {onRemove && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRemove}
                className="p-2 hover:bg-red-100 hover:text-red-600"
                title="Remove track"
              >
                <X className={classes.icon} />
              </Button>
            )}
          </div>
        </div>

        {/* Spotify Badge */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Music className="w-3 h-3" />
            <span>Spotify</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}