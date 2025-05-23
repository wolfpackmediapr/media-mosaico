
import React from "react";
import { ViewMode } from "./ViewModeManager";

interface TimestampedItemProps {
  text: string;
  start: number;
  formatTime: (time: number, includeMs?: boolean) => string;
  viewMode: ViewMode;
  onClick: () => void;
  index: number;
  speaker?: string;
}

const TimestampedItem: React.FC<TimestampedItemProps> = ({
  text,
  start,
  formatTime,
  viewMode,
  onClick,
  index,
  speaker
}) => {
  const handleClick = React.useCallback(() => {
    onClick();
  }, [onClick]);

  if (viewMode === 'speaker' && speaker) {
    return (
      <div 
        key={`speaker-${index}`} 
        className="border-l-2 border-primary/40 pl-3 py-1 hover:border-primary transition-colors cursor-pointer group mb-2"
        onClick={handleClick}
        data-timestamp={start}
        data-speaker={speaker}
      >
        <div className="flex items-center gap-2 mb-1 group-hover:text-primary">
          <span className="font-semibold text-xs">SPEAKER {speaker}</span>
          <span className="text-xs font-mono bg-primary/10 text-primary px-1 rounded group-hover:bg-primary group-hover:text-white">
            {formatTime(start)}
          </span>
        </div>
        <p className="text-sm">{text}</p>
      </div>
    );
  }

  return (
    <div 
      key={`${viewMode}-${index}`} 
      className="flex hover:bg-muted/50 rounded-sm p-1 cursor-pointer group"
      onClick={handleClick}
      data-timestamp={start}
    >
      <span className="text-xs font-mono bg-primary/10 text-primary px-1 rounded mr-2 min-w-14 text-center group-hover:bg-primary group-hover:text-white">
        {formatTime(start, viewMode === 'word')}
      </span>
      <span className={`text-sm flex-1 ${viewMode === 'word' ? 'mr-1' : ''}`}>
        {text}
      </span>
    </div>
  );
};

export default React.memo(TimestampedItem);
