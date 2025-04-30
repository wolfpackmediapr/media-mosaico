
import React from 'react';
import { PlaybackControls } from './PlaybackControls';
import { VolumeControl } from './VolumeControl';
import { PlaybackRateButton } from './PlaybackRateButton';
import { PlaybackControls as PlaybackControlsType, VolumeControls } from './types';

interface AudioPlayerControlsProps {
  isPlaying: boolean;
  playbackControls: PlaybackControlsType;
  volumeControls: VolumeControls; // Now accepts volume as number or number[]
  playbackRate: number;
  onChangePlaybackRate: () => void;
}

export function AudioPlayerControls({
  isPlaying,
  playbackControls,
  volumeControls, // volumeControls.volume can be number or number[]
  playbackRate,
  onChangePlaybackRate
}: AudioPlayerControlsProps) {
  return (
    <div className="flex items-center justify-between px-2">
      <PlaybackControls isPlaying={isPlaying} controls={playbackControls} />

      <div className="flex items-center space-x-2">
        <PlaybackRateButton
          playbackRate={playbackRate}
          onChange={onChangePlaybackRate}
        />
        {/* Pass volumeControls directly */}
        <VolumeControl volumeControls={volumeControls} />
      </div>
    </div>
  );
}
