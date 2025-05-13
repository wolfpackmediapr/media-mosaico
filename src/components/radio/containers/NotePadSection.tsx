
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown, ChevronUp, Save } from "lucide-react";

interface NotePadSectionProps {
  notepadContent: string;
  onNotepadContentChange: (content: string) => void;
  isExpanded: boolean;
  onExpandToggle: (expanded: boolean) => void;
}

const NotePadSection: React.FC<NotePadSectionProps> = ({
  notepadContent,
  onNotepadContentChange,
  isExpanded,
  onExpandToggle
}) => {
  if (!isExpanded) {
    return (
      <div className="flex justify-between items-center p-2 bg-muted rounded-md mb-4">
        <span className="text-sm font-medium">Bloc de notas</span>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => onExpandToggle(true)}
          className="h-8 px-2"
        >
          <ChevronDown className="h-4 w-4" />
          <span className="ml-1">Expandir</span>
        </Button>
      </div>
    );
  }

  return (
    <Card className="mb-4">
      <div className="flex justify-between items-center p-2 bg-muted border-b">
        <span className="text-sm font-medium px-2">Bloc de notas</span>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => onExpandToggle(false)}
          className="h-8 px-2"
        >
          <ChevronUp className="h-4 w-4" />
          <span className="ml-1">Contraer</span>
        </Button>
      </div>
      <CardContent className="p-4">
        <Textarea
          placeholder="Escribe tus notas aquí..."
          className="min-h-[120px] w-full"
          value={notepadContent}
          onChange={(e) => onNotepadContentChange(e.target.value)}
        />
        <div className="mt-2 text-xs text-gray-500">
          Las notas se guardan automáticamente en este navegador
        </div>
      </CardContent>
    </Card>
  );
};

export default NotePadSection;
