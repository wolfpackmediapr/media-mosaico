
import React from 'react';
import { Button } from "@/components/ui/button";

interface PlaybackRateButtonProps {
  playbackRate: number;
  onChange: () => void;
}

export function PlaybackRateButton({ playbackRate, onChange }: PlaybackRateButtonProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onChange}
      className="px-1 h-8"
    >
      {playbackRate}x
    </Button>
  );
}
