import { useState } from 'react';

export const useAudioProcessor = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [transcriptionText, setTranscriptionText] = useState('');
  const [transcriptionMetadata, setTranscriptionMetadata] = useState({
    channel: '',
    program: '',
    category: '',
    broadcastTime: '',
    keywords: [] as string[],
  });

  const processAudio = async () => {
    try {
      setIsProcessing(true);
      // Simulate processing with progress updates
      for (let i = 0; i <= 100; i += 10) {
        setProgress(i);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Mock transcription result
      setTranscriptionText('This is a sample transcription.');
      setTranscriptionMetadata({
        channel: 'Sample Channel',
        program: 'Sample Program',
        category: 'News',
        broadcastTime: new Date().toISOString(),
        keywords: ['sample', 'test', 'demo'],
      });
    } catch (error) {
      console.error('Error processing audio:', error);
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  return {
    isProcessing,
    progress,
    transcriptionText,
    transcriptionMetadata,
    processAudio,
    setTranscriptionText,
  };
};