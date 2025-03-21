
import { Button } from "@/components/ui/button";
import { CardFooter } from "@/components/ui/card";

interface MediaFooterProps {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  onRefresh: () => Promise<void>;
  hasItems: boolean;
}

export function MediaFooter({ 
  currentPage, 
  itemsPerPage, 
  totalItems, 
  onRefresh,
  hasItems
}: MediaFooterProps) {
  return (
    <CardFooter className="flex justify-between border-t pt-6">
      <p className="text-xs text-muted-foreground">
        {hasItems && (
          `Mostrando ${(currentPage - 1) * itemsPerPage + 1} a ${Math.min(currentPage * itemsPerPage, totalItems)} de ${totalItems} medios`
        )}
      </p>
      <Button variant="outline" onClick={onRefresh}>
        Refrescar
      </Button>
    </CardFooter>
  );
}
