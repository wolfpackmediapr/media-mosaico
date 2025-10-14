import React, { useState, useEffect } from 'react';
import VideoPlayer from './VideoPlayer';
import { ChunkedVideoPlayer } from './ChunkedVideoPlayer';
import { resolveVideoSource, getAssembledVideoUrl, type VideoSource } from '@/services/video/videoSourceResolver';

interface EnhancedVideoPlayerProps {
  src: string;
  className?: string;
  onLoadedMetadata?: (duration: number) => void;
  onTimeUpdate?: (currentTime: number) => void;
}

/**
 * Enhanced video player that automatically resolves the video source type
 * and uses the appropriate player component (regular or chunked)
 */
export const EnhancedVideoPlayer: React.FC<EnhancedVideoPlayerProps> = ({
  src,
  className,
  onLoadedMetadata,
  onTimeUpdate
}) => {
  const [videoSource, setVideoSource] = useState<VideoSource | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    resolveSource();
  }, [src]);

  const resolveSource = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Handle blob URLs directly (uploaded files)
      if (src.startsWith('blob:')) {
        setVideoSource({
          type: 'assembled',
          path: src,
          isAvailable: true
        });
        setIsLoading(false);
        return;
      }
      
      // Otherwise resolve from Supabase storage
      const source = await resolveVideoSource(src);
      setVideoSource(source);
      
      if (!source.isAvailable) {
        setError('Video file not available');
      }
    } catch (err) {
      console.error('Error resolving video source:', err);
      setError('Failed to load video');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center bg-muted rounded-md ${className}`}>
        <div className="text-center p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Cargando video...</p>
        </div>
      </div>
    );
  }

  if (error || !videoSource?.isAvailable) {
    return (
      <div className={`flex items-center justify-center bg-muted rounded-md ${className}`}>
        <div className="text-center p-4">
          <p className="text-destructive mb-2">Video no disponible</p>
          <p className="text-sm text-muted-foreground">{error || 'El archivo no se encuentra disponible'}</p>
        </div>
      </div>
    );
  }

  // Render appropriate player based on video source type
  if (videoSource.type === 'chunked' && videoSource.sessionId) {
    return (
      <ChunkedVideoPlayer
        sessionId={videoSource.sessionId}
        className={className}
        onLoadedMetadata={onLoadedMetadata}
        onTimeUpdate={onTimeUpdate}
      />
    );
  }

  if (videoSource.type === 'assembled' && videoSource.path) {
    // For blob URLs, use them directly; for storage paths, get the public URL
    const videoUrl = videoSource.path.startsWith('blob:') 
      ? videoSource.path 
      : getAssembledVideoUrl(videoSource.path);
    
    return (
      <VideoPlayer
        src={videoUrl}
        className={className}
      />
    );
  }

  // Fallback for unknown cases
  return (
    <VideoPlayer
      src={src}
      className={className}
    />
  );
};