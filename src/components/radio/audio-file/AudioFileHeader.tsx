
import { FileAudio, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import FileStatusIndicator from "./FileStatusIndicator";

interface AudioFileHeaderProps {
  file: File;
  index: number;
  onRemove?: (index: number) => void;
  onTogglePlayer: () => void;
  isLoading?: boolean;
  isInvalid?: boolean;
  needsReupload?: boolean;
}

const AudioFileHeader = ({
  file,
  index,
  onRemove,
  onTogglePlayer,
  isLoading = false,
  isInvalid = false,
  needsReupload = false
}: AudioFileHeaderProps) => {
  // Determine the file status
  let fileStatus: "valid" | "invalid" | "needs-reupload" | "loading" = "valid";
  
  if (isLoading) {
    fileStatus = "loading";
  } else if (needsReupload) {
    fileStatus = "needs-reupload";
  } else if (isInvalid) {
    fileStatus = "invalid";
  }

  return (
    <div className="flex items-center justify-between">
      <div
        className="flex items-center gap-2 cursor-pointer"
        onClick={onTogglePlayer}
      >
        <FileAudio className="h-5 w-5 text-primary" />
        <div>
          <p className="text-sm font-medium truncate max-w-[200px]">{file.name}</p>
          <div className="flex items-center gap-3">
            <p className="text-xs text-muted-foreground">
              {(file.size / (1024 * 1024)).toFixed(2)} MB
            </p>
            <FileStatusIndicator status={fileStatus} />
          </div>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          if (onRemove) onRemove(index);
        }}
        className="text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default AudioFileHeader;
