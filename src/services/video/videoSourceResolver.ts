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
    
    // For regular assembled files, check if they exist in storage
    try {
      const { data, error } = await supabase.storage
        .from('video')
        .list('', { search: filePath.split('/').pop() });
      
      if (error) {
        console.error('Error checking assembled file:', error);
        return { type: 'assembled', path: filePath, isAvailable: false };
      }
      
      const fileExists = data && data.length > 0;
      return { type: 'assembled', path: filePath, isAvailable: fileExists };
      
    } catch (storageError) {
      console.error('Storage check failed:', storageError);
      return { type: 'assembled', path: filePath, isAvailable: false };
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