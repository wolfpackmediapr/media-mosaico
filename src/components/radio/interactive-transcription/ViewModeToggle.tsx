
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Eye, Edit, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import SpeakerManagement from "./SpeakerManagement";
import { TranscriptionResult } from "@/services/audio/transcriptionService";

interface ViewModeToggleProps {
  mode: 'interactive' | 'edit';
  onChange: (mode: 'interactive' | 'edit') => void;
  hasUtterances: boolean;
  transcriptionResult?: TranscriptionResult;
  transcriptionId?: string;
}

const ViewModeToggle: React.FC<ViewModeToggleProps> = ({ 
  mode, 
  onChange, 
  hasUtterances,
  transcriptionResult,
  transcriptionId
}) => {
  const [speakerDialogOpen, setSpeakerDialogOpen] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <div className="flex rounded-md border">
        <Button
          variant={mode === 'edit' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onChange('edit')}
          className="rounded-r-none"
        >
          <Edit className="h-4 w-4 mr-1" />
          Editar
        </Button>
        <Button
          variant={mode === 'interactive' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onChange('interactive')}
          disabled={!hasUtterances}
          className="rounded-l-none border-l"
        >
          <Eye className="h-4 w-4 mr-1" />
          Interactivo
        </Button>
      </div>
      
      {hasUtterances && (
        <Dialog open={speakerDialogOpen} onOpenChange={setSpeakerDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Users className="h-4 w-4 mr-1" />
              Hablantes
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Gestión de Hablantes</DialogTitle>
            </DialogHeader>
            <SpeakerManagement 
              transcriptionResult={transcriptionResult}
              transcriptionId={transcriptionId}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default ViewModeToggle;
