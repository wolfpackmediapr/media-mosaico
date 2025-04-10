
import React from 'react';

interface AudioPlayerHeaderProps {
  fileName: string;
}

export function AudioPlayerHeader({ fileName }: AudioPlayerHeaderProps) {
  return (
    <div className="mb-4 px-2">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 truncate">
        {fileName}
      </h3>
    </div>
  );
}
