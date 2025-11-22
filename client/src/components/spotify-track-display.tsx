
import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Music, ExternalLink, Play, Pause, Volume2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

interface SpotifyTrackDisplayProps {
  track: SpotifyTrack | null;
  showPreview?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

// Hook to fetch full track details when we only have basic info
function useTrackDetails(track: SpotifyTrack | null) {
  const [fullTrack, setFullTrack] = React.useState<SpotifyTrack | null>(track);

  React.useEffect(() => {
    if (!track) {
      setFullTrack(null);
      return;
    }

    // Check if we have preview_url already (could be from full API response or stored data)
    if ('preview_url' in track && track.preview_url) {
      setFullTrack(track);
      return;
    }

    // If we don't have preview_url, fetch full track details
    if (track.id) {
      const fetchTrackDetails = async () => {
        try {
          const response = await fetch(`/api/spotify/track/${track.id}`);
          if (response.ok) {
            const fullTrackData = await response.json();
            // Merge with existing track data to preserve any fields we have
            setFullTrack({ ...track, ...fullTrackData } as SpotifyTrack);
          } else {
            setFullTrack(track);
          }
        } catch (error) {
          console.error('Failed to fetch track details:', error);
          setFullTrack(track);
        }
      };

      fetchTrackDetails();
    } else {
      setFullTrack(track);
    }
  }, [track]);

  return fullTrack;
}

export function SpotifyTrackDisplay({ track, size = "md", showPreview = true, className }: SpotifyTrackDisplayProps) {
  const fullTrack = useTrackDetails(track);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [usePreview, setUsePreview] = useState(true);
  const { toast } = useToast();

  // Initialize Spotify Web Playback SDK
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.async = true;
    document.body.appendChild(script);

    // Set up window callback for SDK
    (window as any).onSpotifyWebPlaybackSDKReady = () => {
      console.log('✅ Spotify Web Playback SDK ready');
    };

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !fullTrack?.preview_url) return;

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
  }, [fullTrack?.preview_url]);

  const handlePlayPause = async () => {
    if (!fullTrack?.id) return;

    setIsLoading(true);

    try {
      let currentTrack = fullTrack;
      
      // Get preview URL if not available
      if (!currentTrack?.preview_url && currentTrack?.id) {
        try {
          const response = await fetch(`/api/spotify/track/${currentTrack.id}`);
          if (response.ok) {
            const trackData = await response.json();
            if (trackData.preview_url) {
              currentTrack = { ...currentTrack, preview_url: trackData.preview_url };
            }
          }
        } catch (error) {
          console.error("Failed to fetch track preview:", error);
        }
      }
      
      if (!currentTrack?.preview_url) {
        toast({
          title: "No preview available",
          description: "This track doesn't have a preview. Open in Spotify to play the full track.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      setUsePreview(true);

      if (isPlaying && audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        if (!audioRef.current || audioRef.current.src !== currentTrack.preview_url) {
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
          }
          
          const newAudio = new Audio();
          
          newAudio.addEventListener('ended', () => {
            setIsPlaying(false);
          });
          
          newAudio.addEventListener('error', (e) => {
            console.error("Audio error:", e);
            setIsPlaying(false);
            toast({
              title: "Playback error",
              description: "Could not load preview. Open in Spotify to play.",
              variant: "destructive",
            });
          });

          newAudio.crossOrigin = "anonymous";
          newAudio.preload = "auto";
          newAudio.src = currentTrack.preview_url;
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
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!fullTrack) return null;

  // Helper function to extract album art URL
  const getAlbumArt = (track: SpotifyTrack | any) => {
    if (!track) return undefined;
    
    // Handle simplified stored track data (has image string directly)
    if (typeof track.image === 'string') {
      return track.image;
    }
    
    // Handle full API track data (has album.images array)
    if (track.album?.images && Array.isArray(track.album.images)) {
      const sizeMap = {
        sm: 300,
        md: 640,
        lg: 640,
      };
      const targetSize = sizeMap[size];
      const image = track.album.images.find((img: any) => img.height && img.height <= targetSize) || track.album.images[0];
      return image?.url;
    }
    
    return undefined;
  };

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
  const albumArt = getAlbumArt(fullTrack);

  return (
    <Card className={`bg-gradient-to-r from-green-500/10 to-green-600/10 border-green-200 dark:border-green-800 ${className}`}>
      <CardContent className={classes.container}>
        <div className="flex items-center gap-3">
          {/* Album Art or Music Icon */}
          {albumArt ? (
            <img
              src={albumArt}
              alt={`${typeof fullTrack.album === 'string' ? fullTrack.album : fullTrack.album?.name || 'album'} art`}
              className={`${classes.image} rounded object-cover`}
              onError={(e) => { (e.target as any).style.display = 'none'; }}
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
              {fullTrack.name || fullTrack.name || 'Unknown Track'}
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
              {(fullTrack as any)?.artist || (Array.isArray((fullTrack as any)?.artists) ? (fullTrack as any).artists.map((artist: any) => artist.name).join(", ") : 'Unknown Artist')}
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
                {typeof fullTrack.album === 'string' ? fullTrack.album : fullTrack.album?.name || 'Unknown Album'} {fullTrack.duration_ms ? `• ${formatDuration(fullTrack.duration_ms)}` : ''}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1">
            {showPreview && (
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  onClick={handlePlayPause}
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 hover:bg-green-400/20 transition-colors"
                  disabled={isLoading}
                  title={isPlaying ? "Pause preview" : "Play preview (30 sec)"}
                  data-testid="button-spotify-play"
                >
                  {isLoading ? (
                    <div className="h-4 w-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                  ) : isPlaying ? (
                    <Pause className="h-4 w-4 text-green-500" />
                  ) : (
                    <Play className="h-4 w-4 text-green-500" />
                  )}
                </Button>
                {usePreview && duration > 0 && !isLoading && (
                  <span className="text-xs text-muted-foreground min-w-[3rem]">
                    {formatTime(currentTime)}/{formatTime(duration)}
                  </span>
                )}
                {usePreview && !fullTrack.preview_url && !isLoading && (
                  <span className="text-xs text-muted-foreground">
                    No preview
                  </span>
                )}
                <audio
                  ref={audioRef}
                  src={fullTrack.preview_url || ""} // Ensure src is a string, even if null initially
                  preload="metadata"
                />
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(fullTrack.external_urls.spotify, '_blank')}
              className="p-2 hover:bg-green-400/20 transition-colors"
              title="Open full track in Spotify"
              data-testid="button-spotify-open"
            >
              <ExternalLink className={`${classes.icon} text-green-500`} />
            </Button>
          </div>
        </div>

        {/* Spotify Badge */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Music className="w-3 h-3" />
            <span>Spotify</span>
          </div>
          {size === "lg" && (
            <div className="text-xs text-muted-foreground">
              Popularity: {fullTrack.popularity}%
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
