
import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import TimestampedItem from "./TimestampedItem";
import { TimestampedItem as TimestampedItemType } from "./ViewModeManager";
import { ViewMode } from "./ViewModeManager";

interface TimestampedListProps {
  items: TimestampedItemType[];
  viewMode: ViewMode;
  formatTime: (time: number, includeMs?: boolean) => string;
  onItemClick: (timestamp: number) => void;
}

const TimestampedList: React.FC<TimestampedListProps> = ({
  items,
  viewMode,
  formatTime,
  onItemClick
}) => {
  return (
    <ScrollArea className="h-[200px] rounded-md">
      <div className="space-y-1 p-2">
        {items.map((item, index) => (
          <TimestampedItem
            key={`${viewMode}-${item.start}-${index}`}
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

export default React.memo(TimestampedList);
