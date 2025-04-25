
import React from "react";
import { motion } from "framer-motion";
import { UtteranceTimestamp, Word } from "@/hooks/useRealTimeTranscription";
import { formatTime } from "@/components/radio/timestamped/timeUtils";
import { getSpeakerColor } from "@/components/radio/interactive-transcription/utils";

interface RealTimeSpeakerSegmentProps {
  utterance: UtteranceTimestamp;
  isActive: boolean;
  currentWordIndex: number;
  onClick: () => void;
  refProp?: React.RefObject<HTMLDivElement>;
}

export const RealTimeSpeakerSegment: React.FC<RealTimeSpeakerSegmentProps> = ({
  utterance,
  isActive,
  currentWordIndex,
  onClick,
  refProp
}) => {
  const speakerColor = getSpeakerColor(utterance.speaker);
  
  // Format speaker name for display
  const getSpeakerName = (speaker: string | number) => {
    if (typeof speaker === 'string') {
      return speaker.includes('_') ? 
        `Speaker ${speaker.split('_')[1]}` : 
        `Speaker ${speaker}`;
    }
    return `Speaker ${speaker}`;
  };

  return (
    <div
      ref={refProp}
      onClick={onClick}
      className={`
        p-3 rounded-lg transition-all cursor-pointer
        hover:bg-muted/50
        ${isActive ? 'bg-muted ring-2 ring-primary ring-offset-2' : 'bg-card border'}
      `}
      data-speaker={utterance.speaker}
      data-start={utterance.start}
      data-end={utterance.end}
    >
      <div className="flex items-center gap-2 mb-1">
        <div 
          className="w-4 h-4 rounded-full"
          style={{ backgroundColor: speakerColor }}
        />
        <span className="font-medium text-sm">
          {getSpeakerName(utterance.speaker)}
        </span>
        <span className="text-xs text-muted-foreground ml-auto">
          {formatTime(utterance.start, false)}
        </span>
      </div>
      
      <p 
        className={`text-base leading-relaxed ${isActive ? 'font-medium' : ''}`}
        style={{ 
          borderLeftColor: speakerColor,
          borderLeftWidth: '2px',
          paddingLeft: '0.75rem'
        }}
      >
        {utterance.words && utterance.words.length > 0 ? (
          utterance.words.map((word: Word, wordIdx) => (
            <motion.span
              key={`${word.text}-${wordIdx}`}
              className={`inline-block mr-1 ${
                currentWordIndex === wordIdx ? 'bg-yellow-300 dark:bg-yellow-800' : ''
              }`}
              animate={{
                backgroundColor: currentWordIndex === wordIdx ? 
                  'var(--highlight)' : 
                  'transparent'
              }}
              transition={{ duration: 0.2 }}
            >
              {word.text}
            </motion.span>
          ))
        ) : (
          utterance.text
        )}
      </p>
    </div>
  );
};
