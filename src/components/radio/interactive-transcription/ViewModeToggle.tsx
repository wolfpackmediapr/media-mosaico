
import { Button } from "@/components/ui/button";
import { Edit, Headphones } from "lucide-react";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipTrigger, 
  TooltipProvider 
} from "@/components/ui/tooltip";

interface ViewModeToggleProps {
  mode: 'interactive' | 'edit';
  onChange: (mode: 'interactive' | 'edit') => void;
  hasUtterances: boolean;
}

const ViewModeToggle: React.FC<ViewModeToggleProps> = ({
  mode,
  onChange,
  hasUtterances
}) => {
  if (!hasUtterances) {
    return null;
  }

  return (
    <div className="flex border rounded-md overflow-hidden">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={mode === 'edit' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onChange('edit')}
              className="rounded-none border-0 flex-1"
            >
              <Edit className="h-4 w-4 mr-2" />
              Normal
            </Button>
          </TooltipTrigger>
          <TooltipContent>Modo normal</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={mode === 'interactive' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onChange('interactive')}
              className="rounded-none border-0 flex-1"
            >
              <Headphones className="h-4 w-4 mr-2" />
              Interactivo
            </Button>
          </TooltipTrigger>
          <TooltipContent>Transcripción interactiva</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

export default ViewModeToggle;
