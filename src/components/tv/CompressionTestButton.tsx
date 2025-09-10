import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const CompressionTestButton: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);

  const testCompression = async () => {
    setIsLoading(true);
    try {
      console.log('[CompressionTest] Starting compression test...');
      
      // Create a test transcription record  
      const { data: transcription, error: transcriptionError } = await supabase
        .from('tv_transcriptions')
        .insert({
          original_file_path: 'compression_test.mov',
          status: 'uploading',
          progress: 0
        })
        .select()
        .single();

      if (transcriptionError) {
        throw new Error(`Failed to create test transcription: ${transcriptionError.message}`);
      }

      console.log('[CompressionTest] Created test transcription:', transcription.id);

      // Call the edge function with a test video path
      // Note: This should be a path to an actual large video file for a real test
      const { data, error } = await supabase.functions.invoke('process-tv-with-gemini', {
        body: {
          videoPath: 'test_large_video.mov', // Replace with actual large video path
          transcriptionId: transcription.id
        }
      });

      if (error) {
        throw new Error(`Processing failed: ${error.message}`);
      }

      console.log('[CompressionTest] Processing result:', data);
      toast.success('Compression test completed successfully');

      // Check the transcription record for compression details
      const { data: updatedTranscription } = await supabase
        .from('tv_transcriptions')
        .select('was_compressed, compressed_path, status')
        .eq('id', transcription.id)
        .single();

      console.log('[CompressionTest] Updated transcription:', updatedTranscription);
      
      if (updatedTranscription?.was_compressed) {
        toast.success(`Video was compressed! Path: ${updatedTranscription.compressed_path}`);
      } else {
        toast.info('Video was not compressed (likely under 250MB threshold)');
      }

    } catch (error: any) {
      console.error('[CompressionTest] Error:', error);
      toast.error(`Compression test failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      onClick={testCompression} 
      disabled={isLoading}
      variant="outline"
      size="sm"
    >
      {isLoading ? 'Testing...' : 'Test Compression'}
    </Button>
  );
};

export default CompressionTestButton;