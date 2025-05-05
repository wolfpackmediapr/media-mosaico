
import React from "react";
import { Button } from "@/components/ui/button";
import { Trash2, Layout, LayoutGrid } from "lucide-react";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface FileOperationsProps {
  onRemoveFile: () => void;
  selectedLayout: string;
  onChangeLayout: (layout: string) => void;
}

const FileOperations: React.FC<FileOperationsProps> = ({
  onRemoveFile,
  selectedLayout,
  onChangeLayout
}) => {
  return (
    <div className="flex justify-between">
      <TooltipProvider>
        <div className="flex gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onChangeLayout("split")}
                className={selectedLayout === "split" ? "bg-primary text-primary-foreground" : ""}
              >
                <Layout className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Vista dividida</p>
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onChangeLayout("grid")}
                className={selectedLayout === "grid" ? "bg-primary text-primary-foreground" : ""}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Vista en cuadrícula</p>
            </TooltipContent>
          </Tooltip>
        </div>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onRemoveFile}
              className="text-red-500 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Eliminar archivo actual</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

export default FileOperations;
