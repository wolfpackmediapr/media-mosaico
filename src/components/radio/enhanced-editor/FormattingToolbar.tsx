
import React from 'react';
import { Button } from "@/components/ui/button";
import { CardHeader } from "@/components/ui/card";
import { 
  AlignCenter,
  AlignLeft, 
  AlignRight, 
  Bold, 
  Download, 
  Italic,
  FileText,
  Edit,
  Save
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface FormattingToolbarProps {
  onFormatText: (format: string) => void;
  onAlignText: (alignment: string) => void;
  onExport: (format: 'txt' | 'srt') => void;
  onToggleEditMode?: (isEditMode: boolean) => void;
  isEditMode?: boolean;
}

export const FormattingToolbar = ({ 
  onFormatText, 
  onAlignText, 
  onExport,
  onToggleEditMode,
  isEditMode = false
}: FormattingToolbarProps) => {
  return (
    <CardHeader className="flex flex-row items-center justify-between p-3">
      <div className="flex items-center space-x-1">
        {onToggleEditMode && (
          <Button
            variant="ghost" 
            size="sm" 
            onClick={() => onToggleEditMode(!isEditMode)}
          >
            {isEditMode ? (
              <><Save className="h-4 w-4 mr-1" /> Guardar</>
            ) : (
              <><Edit className="h-4 w-4 mr-1" /> Editar</>
            )}
          </Button>
        )}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => onFormatText('bold')}
          disabled={!isEditMode}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => onFormatText('italic')}
          disabled={!isEditMode}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => onAlignText('left')}
          disabled={!isEditMode}
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => onAlignText('center')}
          disabled={!isEditMode}
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => onAlignText('right')}
          disabled={!isEditMode}
        >
          <AlignRight className="h-4 w-4" />
        </Button>
      </div>
      <div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-1" />
              Exportar
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onExport('txt')}>
              <FileText className="h-4 w-4 mr-2" />
              Texto Plano (.txt)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExport('srt')}>
              <FileText className="h-4 w-4 mr-2" />
              Subtítulos (.srt)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </CardHeader>
  );
};
