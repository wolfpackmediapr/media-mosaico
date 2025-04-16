
import { useState, useMemo } from "react";
import { TranscriptionResult } from "@/services/audio/transcriptionService";
import TimestampControls from "./timestamped/TimestampControls";
import TimestampedList from "./timestamped/TimestampedList";
import EmptyTimestampState from "./timestamped/EmptyTimestampState";
import { formatTime } from "./timestamped/timeUtils";
import { useTimestampedDownload } from "./timestamped/useTimestampedDownload";
import SpeakerTimestampedList from "./timestamped/SpeakerTimestampedList";
import { formatSpeakerTranscript, getSpeakerFormattedText } from "./timestamped/speakerUtils";

interface RadioTimestampedTranscriptionProps {
  transcriptionResult?: TranscriptionResult;
  text: string;
  onTimestampClick?: (timestamp: number) => void;
}

interface TimestampedItem {
  text: string;
  start: number;
  end: number;
  type: 'sentence' | 'word' | 'speaker';
}

const RadioTimestampedTranscription = ({
  transcriptionResult,
  text,
  onTimestampClick
}: RadioTimestampedTranscriptionProps) => {
  // Initialize viewMode with preference for speakers if available, then sentences, then words
  const [viewMode, setViewMode] = useState<'speaker' | 'sentence' | 'word'>(
    transcriptionResult?.utterances?.length ? 'speaker' :
    transcriptionResult?.sentences?.length ? 'sentence' : 'word'
  );
  
  const { downloadSRT } = useTimestampedDownload();
  
  // Generate timestamped items based on available data
  const timestampedItems = useMemo(() => {
    if (!transcriptionResult) return [];
    
    // If we have speaker utterances and we're in speaker mode, use them (top priority)
    if (viewMode === 'speaker' && transcriptionResult.utterances && transcriptionResult.utterances.length > 0) {
      return transcriptionResult.utterances.map(utterance => ({
        text: utterance.text,
        start: utterance.start,
        end: utterance.end,
        type: 'speaker' as const,
        speaker: utterance.speaker
      }));
    }
    
    // If we have sentences with timestamps and we're in sentence mode, use them
    if (viewMode === 'sentence' && transcriptionResult.sentences && transcriptionResult.sentences.length > 0) {
      return transcriptionResult.sentences.map(sentence => ({
        text: sentence.text,
        start: sentence.start,
        end: sentence.end,
        type: 'sentence' as const
      }));
    }
    
    // Fall back to word-level timestamps
    if (transcriptionResult.words && transcriptionResult.words.length > 0) {
      return transcriptionResult.words.map(word => ({
        text: word.text,
        start: word.start,
        end: word.end,
        type: 'word' as const
      }));
    }
    
    return [];
  }, [transcriptionResult, viewMode]);
  
  const handleItemClick = (timestamp: number) => {
    if (onTimestampClick) {
      onTimestampClick(timestamp);
    }
  };
  
  const toggleViewMode = () => {
    if (viewMode === 'speaker' && transcriptionResult?.sentences?.length) {
      setViewMode('sentence');
    } else if (viewMode === 'sentence' && transcriptionResult?.words?.length) {
      setViewMode('word');
    } else {
      // If we have speaker data, cycle back to it, otherwise go to the first available mode
      if (transcriptionResult?.utterances?.length) {
        setViewMode('speaker');
      } else if (transcriptionResult?.sentences?.length) {
        setViewMode('sentence');
      } else if (transcriptionResult?.words?.length) {
        setViewMode('word');
      }
    }
  };

  // Determine available view modes
  const viewModes = {
    speaker: Boolean(transcriptionResult?.utterances?.length),
    sentence: Boolean(transcriptionResult?.sentences?.length),
    word: Boolean(transcriptionResult?.words?.length)
  };
  
  const canToggleViewMode = Object.values(viewModes).filter(Boolean).length > 1;

  // Helper to get the current view mode name in Spanish
  const getViewModeName = () => {
    switch (viewMode) {
      case 'speaker': return 'Vista por Hablantes';
      case 'sentence': return 'Vista por Oraciones';
      case 'word': return 'Vista por Palabras';
    }
  };
  
  // Get the next view mode for the toggle button
  const getNextViewModeName = () => {
    if (viewMode === 'speaker') return 'Cambiar a Oraciones';
    if (viewMode === 'sentence') return 'Cambiar a Palabras';
    return 'Cambiar a Hablantes';
  };
  
  // Generate SRT content based on the current view mode
  const getSrtContent = () => {
    if (viewMode === 'speaker' && transcriptionResult?.utterances) {
      return formatSpeakerTranscript(transcriptionResult.utterances);
    }
    return null; // Let the existing logic handle other modes
  };
  
  if (timestampedItems.length === 0) {
    return <EmptyTimestampState />;
  }

  return (
    <div className="border rounded-md">
      <TimestampControls
        viewMode={viewMode}
        canToggleViewMode={canToggleViewMode}
        onToggleViewMode={toggleViewMode}
        onDownloadSRT={() => downloadSRT(timestampedItems, getSrtContent())}
        viewModeName={getViewModeName()}
        nextViewModeName={getNextViewModeName()}
      />
      
      {viewMode === 'speaker' && transcriptionResult?.utterances ? (
        <SpeakerTimestampedList
          utterances={transcriptionResult.utterances}
          onUtteranceClick={handleItemClick}
        />
      ) : (
        <TimestampedList
          items={timestampedItems}
          viewMode={viewMode === 'word' ? 'word' : 'sentence'}
          formatTime={formatTime}
          onItemClick={handleItemClick}
        />
      )}
    </div>
  );
};

export default RadioTimestampedTranscription;
