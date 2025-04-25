
import React from 'react';
import { Bold, Italic, AlignLeft, AlignCenter, AlignRight, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  ToggleGroup, 
  ToggleGroupItem 
} from '@/components/ui/toggle-group';

interface FormattingToolbarProps {
  onFormatText: (format: string) => void;
  onExport: (format: 'txt' | 'srt') => void;
  onAlignText: (alignment: string) => void;
}

export const FormattingToolbar = ({
  onFormatText,
  onExport,
  onAlignText
}: FormattingToolbarProps) => {
  return (
    <div className="flex items-center gap-2 p-2 border-b">
      <ToggleGroup type="multiple" className="flex gap-1">
        <ToggleGroupItem value="bold" onClick={() => onFormatText('bold')}>
          <Bold className="h-4 w-4" />
        </ToggleGroupItem>
        <ToggleGroupItem value="italic" onClick={() => onFormatText('italic')}>
          <Italic className="h-4 w-4" />
        </ToggleGroupItem>
      </ToggleGroup>

      <Separator orientation="vertical" className="mx-2 h-6" />

      <ToggleGroup type="single" className="flex gap-1">
        <ToggleGroupItem value="left" onClick={() => onAlignText('left')}>
          <AlignLeft className="h-4 w-4" />
        </ToggleGroupItem>
        <ToggleGroupItem value="center" onClick={() => onAlignText('center')}>
          <AlignCenter className="h-4 w-4" />
        </ToggleGroupItem>
        <ToggleGroupItem value="right" onClick={() => onAlignText('right')}>
          <AlignRight className="h-4 w-4" />
        </ToggleGroupItem>
      </ToggleGroup>

      <Separator orientation="vertical" className="mx-2 h-6" />

      <Button
        variant="ghost"
        size="sm"
        onClick={() => onExport('txt')}
      >
        <Download className="h-4 w-4 mr-1" />
        TXT
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onExport('srt')}
      >
        <Download className="h-4 w-4 mr-1" />
        SRT
      </Button>
    </div>
  );
};
