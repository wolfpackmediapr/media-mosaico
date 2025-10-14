import React, { useRef, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ChunkInfo {
  index: number;
  path: string;
  size: number;
  start: number;
  end: number;
}

interface ChunkedVideoPlayerProps {
  sessionId: string;
  className?: string;
  onLoadedMetadata?: (duration: number) => void;
  onTimeUpdate?: (currentTime: number) => void;
  registerVideoElement?: (element: HTMLVideoElement | null) => void;
  isPlaying?: boolean;
}

export const ChunkedVideoPlayer: React.FC<ChunkedVideoPlayerProps> = ({
  sessionId,
  className,
  onLoadedMetadata,
  onTimeUpdate,
  registerVideoElement,
  isPlaying: externalIsPlaying
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaSourceRef = useRef<MediaSource | null>(null);
  const sourceBufferRef = useRef<SourceBuffer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chunkManifest, setChunkManifest] = useState<{
    chunks: ChunkInfo[];
    totalSize: number;
    mimeType: string;
  } | null>(null);

  useEffect(() => {
    loadChunkManifest();
  }, [sessionId]);

  // Phase 1 & 2: Register video element immediately on mount
  useEffect(() => {
    if (videoRef.current && registerVideoElement) {
      console.log('[ChunkedVideoPlayer] Registering video element immediately on mount');
      registerVideoElement(videoRef.current);
    }
    
    return () => {
      if (registerVideoElement) {
        console.log('[ChunkedVideoPlayer] Unregistering video element on unmount');
        registerVideoElement(null);
      }
    };
  }, [registerVideoElement]);

  const loadChunkManifest = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get chunk manifest from database
      const { data: manifest, error: manifestError } = await supabase
        .from('video_chunk_manifests')
        .select('*')
        .eq('session_id', sessionId)
        .single();

      if (manifestError || !manifest) {
        throw new Error('Failed to load chunk manifest');
      }

      const chunkOrder = manifest.chunk_order as unknown as ChunkInfo[];
      setChunkManifest({
        chunks: chunkOrder,
        totalSize: manifest.total_size,
        mimeType: manifest.mime_type || 'video/mp4'
      });

      // Initialize MediaSource for streaming playback
      await initializeMediaSource(chunkOrder, manifest.mime_type || 'video/mp4');

    } catch (err) {
      console.error('Error loading chunk manifest:', err);
      setError(err instanceof Error ? err.message : 'Failed to load video');
      toast.error('Error al cargar el video', {
        description: 'No se pudo cargar la información del video'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const initializeMediaSource = async (chunks: ChunkInfo[], mimeType: string) => {
    if (!videoRef.current) return;

    try {
      // Check if MediaSource is supported
      if (!window.MediaSource) {
        // Fallback: Load first chunk as regular video
        await loadFirstChunkAsFallback(chunks[0]);
        return;
      }

      const mediaSource = new MediaSource();
      mediaSourceRef.current = mediaSource;
      
      const objectURL = URL.createObjectURL(mediaSource);
      videoRef.current.src = objectURL;

      mediaSource.addEventListener('sourceopen', () => {
        try {
          // Create source buffer
          const sourceBuffer = mediaSource.addSourceBuffer(mimeType);
          sourceBufferRef.current = sourceBuffer;

          // Start loading chunks progressively
          loadChunksProgressively(chunks);

        } catch (err) {
          console.error('Error creating source buffer:', err);
          // Fallback to first chunk
          loadFirstChunkAsFallback(chunks[0]);
        }
      });

      mediaSource.addEventListener('error', (e) => {
        console.error('MediaSource error:', e);
        // Fallback to first chunk
        loadFirstChunkAsFallback(chunks[0]);
      });

    } catch (err) {
      console.error('Error initializing MediaSource:', err);
      // Fallback to first chunk
      await loadFirstChunkAsFallback(chunks[0]);
    }
  };

  const loadFirstChunkAsFallback = async (firstChunk: ChunkInfo) => {
    try {
      console.log('Using fallback: loading first chunk as regular video');
      
      const { data: chunkBlob, error } = await supabase.storage
        .from('video')
        .download(firstChunk.path);

      if (error || !chunkBlob) {
        throw new Error('Failed to load first chunk');
      }

      const blobUrl = URL.createObjectURL(chunkBlob);
      if (videoRef.current) {
        videoRef.current.src = blobUrl;
      }

    } catch (err) {
      console.error('Fallback loading failed:', err);
      setError('Failed to load video');
    }
  };

  const loadChunksProgressively = async (chunks: ChunkInfo[]) => {
    const sourceBuffer = sourceBufferRef.current;
    if (!sourceBuffer) return;

    try {
      // Load first few chunks to enable playback
      const initialChunks = chunks.slice(0, Math.min(3, chunks.length));
      
      for (const chunk of initialChunks) {
        if (sourceBuffer.updating) {
          await waitForUpdateEnd(sourceBuffer);
        }

        const { data: chunkBlob, error } = await supabase.storage
          .from('video')
          .download(chunk.path);

        if (error || !chunkBlob) {
          console.error(`Failed to load chunk ${chunk.index}:`, error);
          continue;
        }

        const arrayBuffer = await chunkBlob.arrayBuffer();
        
        if (!sourceBuffer.updating) {
          sourceBuffer.appendBuffer(arrayBuffer);
          await waitForUpdateEnd(sourceBuffer);
        }
      }

      // Load remaining chunks as needed during playback
      // This would be enhanced with proper buffering logic
      
    } catch (err) {
      console.error('Error loading chunks progressively:', err);
    }
  };

  const waitForUpdateEnd = (sourceBuffer: SourceBuffer): Promise<void> => {
    return new Promise((resolve) => {
      if (!sourceBuffer.updating) {
        resolve();
        return;
      }
      
      const onUpdateEnd = () => {
        sourceBuffer.removeEventListener('updateend', onUpdateEnd);
        resolve();
      };
      
      sourceBuffer.addEventListener('updateend', onUpdateEnd);
    });
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current && onLoadedMetadata) {
      onLoadedMetadata(videoRef.current.duration);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current && onTimeUpdate) {
      onTimeUpdate(videoRef.current.currentTime);
    }
  };

  // Phase 1: Single source of truth - sync with external playing state only
  useEffect(() => {
    const video = videoRef.current;
    if (!video || externalIsPlaying === undefined) return;

    console.log('[ChunkedVideoPlayer] External isPlaying changed:', externalIsPlaying, 'Video paused:', video.paused, 'ReadyState:', video.readyState);

    // Phase 5: Add validation before operations
    if (video.readyState < 2) {
      console.log('[ChunkedVideoPlayer] Video not ready yet, waiting for readyState >= 2');
      return;
    }

    if (externalIsPlaying && video.paused) {
      console.log('[ChunkedVideoPlayer] Playing video due to external state');
      const playPromise = video.play();
      if (playPromise) {
        playPromise.catch(err => {
          console.error('[ChunkedVideoPlayer] Failed to play:', err);
          toast.error('Error al reproducir video', { description: err.message });
        });
      }
    } else if (!externalIsPlaying && !video.paused) {
      console.log('[ChunkedVideoPlayer] Pausing video due to external state');
      video.pause();
    }
  }, [externalIsPlaying]);

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-muted rounded-md ${className}`}>
        <div className="text-center p-4">
          <p className="text-destructive mb-2">Error al cargar el video</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

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

  return (
    <video
      ref={videoRef}
      className={className}
      controls
      onLoadedMetadata={handleLoadedMetadata}
      onTimeUpdate={handleTimeUpdate}
      onError={(e) => {
        console.error('Video playback error:', e);
        setError('Error durante la reproducción del video');
      }}
    >
      Tu navegador no soporta la reproducción de video.
    </video>
  );
};