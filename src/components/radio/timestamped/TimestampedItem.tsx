
interface TimestampedItemProps {
  text: string;
  start: number;
  formatTime: (time: number, includeMs?: boolean) => string;
  viewMode: 'sentence' | 'word';
  onClick: () => void;
  index: number;
}

const TimestampedItem = ({
  text,
  start,
  formatTime,
  viewMode,
  onClick,
  index
}: TimestampedItemProps) => {
  return (
    <div 
      key={`${viewMode}-${index}`} 
      className="flex hover:bg-muted/50 rounded-sm p-1 cursor-pointer group"
      onClick={onClick}
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

export default TimestampedItem;
