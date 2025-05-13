
import React from "react";
import NotepadEditor from "../notepad/NotepadEditor";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";

interface NotePadSectionProps {
  notepadContent: string;
  onNotepadContentChange: (content: string) => void;
  isExpanded: boolean;
  onExpandToggle: (isExpanded: boolean) => void;
}

const NotePadSection: React.FC<NotePadSectionProps> = ({
  notepadContent,
  onNotepadContentChange,
  isExpanded,
  onExpandToggle
}) => {
  const handleExpandClick = () => {
    onExpandToggle(!isExpanded);
  };

  return (
    <Card className="w-full">
      <Collapsible open={isExpanded} onOpenChange={onExpandToggle}>
        <CardHeader className="px-6 py-4 flex flex-row items-center justify-between">
          <CardTitle className="text-xl">Bloc de Notas</CardTitle>
          <CollapsibleTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-9 p-0"
              onClick={handleExpandClick}
              aria-label={isExpanded ? "Colapsar bloc de notas" : "Expandir bloc de notas"}
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
        </CardHeader>
        
        <CollapsibleContent>
          <CardContent className="px-6 pb-4 pt-0">
            <NotepadEditor 
              content={notepadContent}
              onContentChange={onNotepadContentChange}
              placeholder="Escribe tus notas aquí..."
              minHeight="200px"
            />
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default React.memo(NotePadSection);
