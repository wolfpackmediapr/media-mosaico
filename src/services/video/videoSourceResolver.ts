import { supabase } from '@/integrations/supabase/client';

export type VideoPlaybackType = 'assembled' | 'chunked';

export interface VideoSource {
  type: VideoPlaybackType;
  path?: string;  // For assembled files
  sessionId?: string;  // For chunked files
  isAvailable: boolean;
}

/**
 * Resolves the video source and playback method for a given file path
 */
export const resolveVideoSource = async (filePath: string): Promise<VideoSource> => {
  try {
    // Skip resolution for blob URLs (local previews)
    if (filePath.startsWith('blob:')) {
      return { type: 'assembled', path: filePath, isAvailable: false };
    }
    
    // Check if this is a chunked file reference
    if (filePath.startsWith('chunked:')) {
      const sessionId = filePath.replace('chunked:', '');
      
      // Verify the chunk manifest exists
      const { data: manifest, error } = await supabase
        .from('video_chunk_manifests')
        .select('id')
        .eq('session_id', sessionId)
        .single();
      
      if (error || !manifest) {
        console.error('Chunk manifest not found for session:', sessionId);
        return { type: 'chunked', sessionId, isAvailable: false };
      }
      
      return { type: 'chunked', sessionId, isAvailable: true };
    }
    
    // FIX: Check if this is already a full Supabase public URL
    if (filePath.includes('supabase.co/storage/v1/object/public/')) {
      console.log('[videoSourceResolver] Detected Supabase public URL, using directly:', filePath);
      // Extract the actual file path from the public URL
      const pathMatch = filePath.match(/\/video\/(.+)$/);
      const actualPath = pathMatch ? pathMatch[1] : filePath;
      // Trust that the URL is valid - Supabase public URLs are always accessible
      return { type: 'assembled', path: actualPath, isAvailable: true };
    }
    
    // For regular assembled files (storage paths), check if they exist in storage
    try {
      const fileName = filePath.split('/').pop();
      const { data, error } = await supabase.storage
        .from('video')
        .list('', { search: fileName });
      
      if (error) {
        console.error('Error checking assembled file:', error);
        // Even if check fails, assume it's available (optimistic)
        return { type: 'assembled', path: filePath, isAvailable: true };
      }
      
      const fileExists = data && data.length > 0;
      console.log('[videoSourceResolver] File existence check:', fileName, fileExists);
      return { type: 'assembled', path: filePath, isAvailable: fileExists };
      
    } catch (storageError) {
      console.error('Storage check failed:', storageError);
      // Assume available on error (optimistic approach)
      return { type: 'assembled', path: filePath, isAvailable: true };
    }
    
  } catch (error) {
    console.error('Error resolving video source:', error);
    return { type: 'assembled', path: filePath, isAvailable: false };
  }
};

/**
 * Gets the public URL for an assembled video file
 */
export const getAssembledVideoUrl = (filePath: string): string => {
  const { data } = supabase.storage
    .from('video')
    .getPublicUrl(filePath);
  
  return data.publicUrl;
};

/**
 * Checks if chunked playback is supported in the current browser
 */
export const isChunkedPlaybackSupported = (): boolean => {
  // Check for MediaSource API support
  return typeof window !== 'undefined' && 
         'MediaSource' in window && 
         MediaSource.isTypeSupported('video/mp4; codecs="avc1.42E01E"');
};