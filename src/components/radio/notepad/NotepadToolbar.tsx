
import React from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Bold, 
  Italic, 
  Underline, 
  ListOrdered, 
  ListUnordered, 
  AlignLeft, 
  AlignCenter, 
  AlignRight,
  Link,
  Image
} from "lucide-react";

interface FormatButtonProps {
  icon: React.ReactNode;
  tooltip: string;
  command: string;
  value?: string;
}

const FormatButton = ({ icon, tooltip, command, value }: FormatButtonProps) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    document.execCommand(command, false, value);
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={handleClick}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
};

const NotepadToolbar = () => {
  return (
    <div className="flex flex-wrap items-center gap-1 border-b p-2 bg-muted/50">
      <FormatButton icon={<Bold size={16} />} tooltip="Bold" command="bold" />
      <FormatButton icon={<Italic size={16} />} tooltip="Italic" command="italic" />
      <FormatButton icon={<Underline size={16} />} tooltip="Underline" command="underline" />
      
      <div className="h-4 w-px bg-border mx-1" />
      
      <FormatButton icon={<ListUnordered size={16} />} tooltip="Bullet List" command="insertUnorderedList" />
      <FormatButton icon={<ListOrdered size={16} />} tooltip="Numbered List" command="insertOrderedList" />
      
      <div className="h-4 w-px bg-border mx-1" />
      
      <FormatButton icon={<AlignLeft size={16} />} tooltip="Align Left" command="justifyLeft" />
      <FormatButton icon={<AlignCenter size={16} />} tooltip="Align Center" command="justifyCenter" />
      <FormatButton icon={<AlignRight size={16} />} tooltip="Align Right" command="justifyRight" />
      
      <div className="h-4 w-px bg-border mx-1" />
      
      <FormatButton 
        icon={<Link size={16} />} 
        tooltip="Insert Link" 
        command="createLink" 
        value={window.prompt("Enter the URL") || "https://"}
      />
    </div>
  );
};

export default NotepadToolbar;
