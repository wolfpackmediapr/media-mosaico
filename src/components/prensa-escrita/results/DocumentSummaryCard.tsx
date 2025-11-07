import React from "react";
import { FileText } from "lucide-react";

interface DocumentSummaryCardProps {
  summary: string;
}

const DocumentSummaryCard = ({ summary }: DocumentSummaryCardProps) => {
  return (
    <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
      <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
        <FileText className="h-5 w-5" />
        Resumen del Documento
      </h3>
      <p className="text-sm text-muted-foreground">{summary}</p>
    </div>
  );
};

export default DocumentSummaryCard;
