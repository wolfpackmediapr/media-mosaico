
import { ScrollArea } from "@/components/ui/scroll-area";
import TimestampedItem from "./TimestampedItem";
import { TimestampedItem as TimestampedItemType } from "./ViewModeManager";

interface TimestampedListProps {
  items: TimestampedItemType[];
  viewMode: 'sentence' | 'word';
  formatTime: (time: number, includeMs?: boolean) => string;
  onItemClick: (timestamp: number) => void;
}

const TimestampedList = ({
  items,
  viewMode,
  formatTime,
  onItemClick
}: TimestampedListProps) => {
  if (items.length === 0) {
    return (
      <div className="p-4 border rounded-md bg-muted/20 min-h-[200px] flex items-center justify-center">
        <p className="text-muted-foreground">No hay datos de timestamps disponibles</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[200px] rounded-md">
      <div className="space-y-1 p-2">
        {items.map((item, index) => (
          <TimestampedItem
            key={`${viewMode}-${index}`}
            text={item.text}
            start={item.start}
            formatTime={formatTime}
            viewMode={viewMode}
            onClick={() => onItemClick(item.start)}
            index={index}
          />
        ))}
      </div>
    </ScrollArea>
  );
};

export default TimestampedList;
