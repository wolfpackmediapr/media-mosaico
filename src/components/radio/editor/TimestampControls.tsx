
import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";

interface TimestampControlsProps {
  timestamp?: number;
  onTimestampClick?: (timestamp: number) => void;
  showTimestamps: boolean;
  hasTimestampData: boolean;
}

const TimestampControls = ({
  timestamp,
  onTimestampClick,
  showTimestamps,
  hasTimestampData
}: TimestampControlsProps) => {
  if (!showTimestamps || !hasTimestampData || !timestamp) {
    return null;
  }

  // Format timestamp for display (seconds to mm:ss)
  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <Badge 
      variant="outline" 
      className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
      onClick={() => onTimestampClick?.(timestamp)}
    >
      <Clock className="w-3 h-3 mr-1" />
      {formatTime(timestamp)}
    </Badge>
  );
};

export default TimestampControls;
