
import React, { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
} from "lucide-react";
import { useMediaSession } from "@/hooks/use-media-session";
import { usePersistentState } from "@/hooks/use-persistent-state";
import { useStickyState } from "@/hooks/use-sticky-state";

interface VideoPlayerProps {
  src: string;
  className?: string;
  title?: string;
}

const VideoPlayer = ({ src, className, title = "Video" }: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  // Use persistent volume setting
  const [volume, setVolume] = usePersistentState<number[]>(
    'video-player-volume', 
    [50], 
    { storage: 'localStorage' }
  );
  
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Use sticky state for the player (optional floating mode)
  const { isSticky, stickyRef, toggleSticky } = useStickyState({
    persistKey: `video-sticky-${src.substring(0, 20)}`,
    defaultSticky: false
  });
  
  // Save and restore playback position
  const [playbackPositions, setPlaybackPositions] = usePersistentState<Record<string, number>>(
    'video-positions',
    {},
    { storage: 'sessionStorage' }
  );

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      
      // Save position periodically
      if (src) {
        setPlaybackPositions(prev => ({
          ...prev,
          [src]: video.currentTime
        }));
      }
    };
    
    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      
      // Restore last position if available
      if (src && playbackPositions[src]) {
        video.currentTime = playbackPositions[src];
        setCurrentTime(playbackPositions[src]);
      }
    };
    
    const handleFullscreenChange = () => 
      setIsFullscreen(document.fullscreenElement !== null);

    // Set initial volume from stored preferences
    video.volume = volume[0] / 100;
    
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [src, playbackPositions]);

  // Integrate with Media Session API
  useMediaSession({
    title,
    artist: 'Video Player',
    onPlay: () => {
      if (videoRef.current && !isPlaying) {
        videoRef.current.play();
        setIsPlaying(true);
      }
    },
    onPause: () => {
      if (videoRef.current && isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    },
    onSeekBackward: () => {
      if (videoRef.current) {
        videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
      }
    },
    onSeekForward: () => {
      if (videoRef.current) {
        videoRef.current.currentTime = Math.min(
          videoRef.current.duration, 
          videoRef.current.currentTime + 10
        );
      }
    }
  });

  // Handle visibility changes for background playback persistence
  useEffect(() => {
    const wasPlayingBeforeHidden = useRef(false);
    
    const handleVisibilityChange = () => {
      const video = videoRef.current;
      if (!video) return;
      
      if (document.hidden) {
        // Save playing state before hiding
        wasPlayingBeforeHidden.current = !video.paused;
        
        // Save position
        if (src && video.currentTime > 0) {
          setPlaybackPositions(prev => ({
            ...prev,
            [src]: video.currentTime
          }));
        }
        console.log('[VideoPlayer] Tab hidden, was playing:', wasPlayingBeforeHidden.current);
      } else {
        // Resume if was playing before
        console.log('[VideoPlayer] Tab visible, resuming if needed...');
        
        if (wasPlayingBeforeHidden.current && video.paused) {
          setTimeout(() => {
            if (video.readyState >= 2 && !video.ended) {
              video.play()
                .then(() => {
                  setIsPlaying(true);
                  console.log('[VideoPlayer] Video resumed successfully');
                })
                .catch(err => console.error('[VideoPlayer] Resume error:', err));
            }
          }, 500);
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [src, setPlaybackPositions]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleProgress = (value: number[]) => {
    if (!videoRef.current) return;
    const time = (value[0] / 100) * duration;
    videoRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const handleVolume = (value: number[]) => {
    if (!videoRef.current) return;
    const newVolume = value[0] / 100;
    videoRef.current.volume = newVolume;
    setVolume(value);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    if (isMuted) {
      videoRef.current.volume = volume[0] / 100;
      setIsMuted(false);
    } else {
      videoRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  const toggleFullscreen = async () => {
    if (!videoRef.current) return;
    
    if (!document.fullscreenElement) {
      await videoRef.current.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div 
      className={cn(
        "relative group rounded-lg", 
        isSticky ? "fixed bottom-4 right-4 w-72 z-50 shadow-lg" : "",
        className
      )}
      ref={stickyRef}
    >
      {isSticky && (
        <Button 
          size="sm" 
          variant="secondary" 
          className="absolute -top-8 right-0 z-10 opacity-80"
          onClick={toggleSticky}
        >
          Restaurar
        </Button>
      )}
      
      <video
        ref={videoRef}
        src={src}
        className={cn("w-full rounded-lg", isSticky ? "max-h-40" : "")}
        onClick={togglePlay}
      />
      
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <div className="absolute bottom-0 left-0 right-0 p-4 pointer-events-auto">
        <div className="space-y-2">
          {/* Progress bar */}
          <Slider
            value={[currentTime ? (currentTime / duration) * 100 : 0]}
            onValueChange={handleProgress}
            max={100}
            step={0.1}
            className="cursor-pointer"
          />
          
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {/* Play/Pause button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={togglePlay}
                className="text-white hover:bg-white/20"
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>

              {/* Volume control */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleMute}
                  className="text-white hover:bg-white/20"
                >
                  {isMuted ? (
                    <VolumeX className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </Button>
                <Slider
                  value={volume}
                  onValueChange={handleVolume}
                  max={100}
                  step={1}
                  className="w-24"
                />
              </div>

              {/* Time display */}
              <span className="text-white text-sm">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            {/* PIP/Sticky mode toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSticky}
              className="text-white hover:bg-white/20 mr-2"
              title={isSticky ? "Exit Picture-in-Picture" : "Picture-in-Picture"}
            >
              {isSticky ? (
                <Minimize className="h-4 w-4" />
              ) : (
                <div className="h-4 w-4 border border-white rounded-sm flex items-center justify-center">
                  <div className="h-2 w-2 bg-white rounded-sm"></div>
                </div>
              )}
            </Button>

            {/* Fullscreen button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFullscreen}
              className="text-white hover:bg-white/20"
            >
              {isFullscreen ? (
                <Minimize className="h-4 w-4" />
              ) : (
                <Maximize className="h-4 w-4" />
              )}
            </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
