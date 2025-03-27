
import { Button } from "@/components/ui/button";

interface ProgramsFooterProps {
  onRefresh: () => void;
  isLoading: boolean;
  totalCount: number;
  currentPage: number;
  itemsPerPage: number;
}

export function ProgramsFooter({
  onRefresh,
  isLoading,
  totalCount,
  currentPage,
  itemsPerPage
}: ProgramsFooterProps) {
  return (
    <div className="flex justify-between">
      <Button variant="outline" onClick={onRefresh} disabled={isLoading}>
        Refrescar
      </Button>
      <div className="text-sm text-muted-foreground">
        {totalCount > 0 && (
          `Mostrando ${(currentPage - 1) * itemsPerPage + 1} a ${Math.min(currentPage * itemsPerPage, totalCount)} de ${totalCount} programas`
        )}
      </div>
    </div>
  );
}
