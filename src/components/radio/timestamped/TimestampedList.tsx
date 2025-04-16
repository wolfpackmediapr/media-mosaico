
import { ScrollArea } from "@/components/ui/scroll-area";
import TimestampedItem from "./TimestampedItem";
import { TimestampedItem as TimestampedItemType } from "./ViewModeManager";
import { Skeleton } from "@/components/ui/skeleton";

interface TimestampedListProps {
  items: TimestampedItemType[];
  viewMode: 'sentence' | 'word' | 'speaker';
  formatTime: (time: number, includeMs?: boolean) => string;
  onItemClick: (timestamp: number) => void;
  isLoading?: boolean;
}

const TimestampedList = ({
  items,
  viewMode,
  formatTime,
  onItemClick,
  isLoading = false
}: TimestampedListProps) => {
  if (isLoading) {
    return (
      <div className="p-4 space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={`skeleton-${i}`} className="flex gap-2">
            <Skeleton className="h-5 w-14" />
            <Skeleton className="h-5 flex-1" />
          </div>
        ))}
      </div>
    );
  }

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
            speaker={item.type === 'speaker' ? item.speaker : undefined}
          />
        ))}
      </div>
    </ScrollArea>
  );
};

export default TimestampedList;
