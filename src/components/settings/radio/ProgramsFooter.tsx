
import { Button } from "@/components/ui/button";
import { CardFooter } from "@/components/ui/card";

interface ProgramsFooterProps {
  onRefresh: () => void;
}

export function ProgramsFooter({ onRefresh }: ProgramsFooterProps) {
  return (
    <CardFooter>
      <Button variant="outline" onClick={onRefresh}>Refrescar</Button>
    </CardFooter>
  );
}
