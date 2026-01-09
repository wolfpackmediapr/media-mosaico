import React, { useState, useEffect, useRef, useCallback } from 'react';
import VideoPlayer from './VideoPlayer';
import { ChunkedVideoPlayer } from './ChunkedVideoPlayer';
import { resolveVideoSource, getAssembledVideoUrl, type VideoSource } from '@/services/video/videoSourceResolver';
import { recreateBlobUrl, getCachedFile, isBlobUrlValid } from '@/hooks/tv/useFileCache';

interface EnhancedVideoPlayerProps {
  src: string;
  className?: string;
  onLoadedMetadata?: (duration: number) => void;
  onTimeUpdate?: (currentTime: number) => void;
  registerVideoElement?: (element: HTMLVideoElement | null) => void;
  isPlaying?: boolean;
  fileId?: string; // Optional file ID for cache lookup
}

/**
 * Enhanced video player that automatically resolves the video source type
 * and uses the appropriate player component (regular or chunked)
 * 
 * Includes visibility change handling to recover from invalid blob URLs
 */
export const EnhancedVideoPlayer: React.FC<EnhancedVideoPlayerProps> = ({
  src,
  className,
  onLoadedMetadata,
  onTimeUpdate,
  registerVideoElement,
  isPlaying = false,
  fileId
}) => {
  const [videoSource, setVideoSource] = useState<VideoSource | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const prevSrcRef = useRef<string>('');
  const isMountedRef = useRef(true);

  const resolveSource = useCallback(async () => {
    if (!src) return;
    
    console.log('[EnhancedVideoPlayer] Resolving source:', {
      src: src.substring(0, 80),
      isBlob: src.startsWith('blob:'),
      isChunked: src.startsWith('chunked:')
    });
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Handle blob URLs directly - they're immediately valid for playback
      if (src.startsWith('blob:')) {
        console.log('[EnhancedVideoPlayer] Using blob URL directly');
        if (isMountedRef.current) {
          setVideoSource({
            type: 'assembled',
            path: src,
            isAvailable: true
          });
          setIsLoading(false);
        }
        return;
      }
      
      // Handle chunked video references
      if (src.startsWith('chunked:')) {
        const sessionId = src.replace('chunked:', '');
        console.log('[EnhancedVideoPlayer] Chunked video, sessionId:', sessionId);
        if (isMountedRef.current) {
          setVideoSource({
            type: 'chunked',
            sessionId,
            isAvailable: true
          });
          setIsLoading(false);
        }
        return;
      }
      
      // Otherwise resolve from Supabase storage
      const source = await resolveVideoSource(src);
      console.log('[EnhancedVideoPlayer] Resolved source:', source);
      
      if (isMountedRef.current) {
        setVideoSource(source);
        
        if (!source.isAvailable) {
          setError('Video file not available');
        }
      }
    } catch (err) {
      console.error('[EnhancedVideoPlayer] Error resolving video source:', err);
      if (isMountedRef.current) {
        setError('Failed to load video');
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [src]);

  // Only resolve if src actually changed
  useEffect(() => {
    if (prevSrcRef.current !== src) {
      prevSrcRef.current = src;
      resolveSource();
    }
  }, [src, resolveSource]);

  // FIX: Visibility change handler to recover from invalid blob URLs using file cache
  // Only attempt recovery if the current blob URL is actually invalid
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (!document.hidden && videoSource) {
        // Check if the current source is a blob URL (may be invalid after tab switch)
        if (videoSource.path?.startsWith('blob:')) {
          // First, check if the current blob URL is still valid - don't switch if it's working
          const isValid = await isBlobUrlValid(videoSource.path);
          if (isValid) {
            console.log('[EnhancedVideoPlayer] Blob URL still valid, no recovery needed');
            return;
          }
          
          console.log('[EnhancedVideoPlayer] Blob URL invalid, attempting recovery...');
          
          // First try: Recreate blob URL from file cache
          if (fileId) {
            const cachedFile = getCachedFile(fileId);
            if (cachedFile) {
              const newBlobUrl = recreateBlobUrl(fileId);
              if (newBlobUrl && isMountedRef.current) {
                console.log('[EnhancedVideoPlayer] Recreated blob URL from cache:', newBlobUrl.substring(0, 50));
                setVideoSource({
                  type: 'assembled',
                  path: newBlobUrl,
                  isAvailable: true
                });
                return;
              }
            }
          }
          
          // Second try: Check sessionStorage for permanent URL
          const storedVideoUrl = sessionStorage.getItem('tv-uploaded-video-url');
          if (storedVideoUrl && !storedVideoUrl.startsWith('blob:')) {
            console.log('[EnhancedVideoPlayer] Using permanent URL for recovery:', storedVideoUrl.substring(0, 50));
            if (isMountedRef.current) {
              setVideoSource({
                type: storedVideoUrl.startsWith('chunked:') ? 'chunked' : 'assembled',
                path: storedVideoUrl,
                sessionId: storedVideoUrl.startsWith('chunked:') ? storedVideoUrl.replace('chunked:', '') : undefined,
                isAvailable: true
              });
            }
            return;
          }
          
          // If we can't recover, show error
          console.log('[EnhancedVideoPlayer] Could not recover blob URL');
          if (isMountedRef.current) {
            setError('Video no disponible. Por favor, vuelva a subir el archivo.');
          }
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [videoSource, fileId]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

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
        registerVideoElement={registerVideoElement}
        isPlaying={isPlaying}
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
        registerVideoElement={registerVideoElement}
        isPlaying={isPlaying}
      />
    );
  }

  // Fallback for unknown cases
  return (
    <VideoPlayer
      src={src}
      className={className}
      registerVideoElement={registerVideoElement}
      isPlaying={isPlaying}
    />
  );
};