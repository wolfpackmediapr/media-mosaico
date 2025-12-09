import React, { useState } from "react";
import { FileText, Tag, Users, Newspaper, ChevronDown, ChevronUp, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { DocumentMetadata } from "@/hooks/prensa/types";

interface DocumentSummaryCardProps {
  summary: string;
  metadata?: DocumentMetadata;
}

const DocumentSummaryCard = ({ summary, metadata }: DocumentSummaryCardProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [editableSummary, setEditableSummary] = useState(summary);
  const [isCopied, setIsCopied] = useState(false);

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(formattedSummary);
      setIsCopied(true);
      toast.success("Análisis copiado al portapapeles");
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      toast.error("Error al copiar el texto");
    }
  };

  // Parse summary to extract sections if it has structured format
  const hasStructuredFormat = summary.includes('RESUMEN EJECUTIVO') || 
                               summary.includes('CONTENIDO POR SECCIONES') ||
                               summary.includes('ARTÍCULOS DESTACADOS');

  // Format the summary for display (convert \n to actual newlines)
  const formattedSummary = editableSummary.replace(/\\n/g, '\n');

  return (
    <div className="mb-6 bg-primary/5 border border-primary/20 rounded-lg overflow-hidden">
      {/* Header */}
      <div 
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-primary/10 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Análisis del Documento</h3>
            {metadata && (
              <p className="text-sm text-muted-foreground">
                {metadata.totalClippings} artículos encontrados • {metadata.categories.length} categorías
              </p>
            )}
          </div>
        </div>
        <Button variant="ghost" size="sm">
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Summary Content - Editable */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Análisis del documento</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyText}
                className="h-8 gap-2"
              >
                {isCopied ? (
                  <>
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-green-500">Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span>Copiar</span>
                  </>
                )}
              </Button>
            </div>
            <Textarea
              value={formattedSummary}
              onChange={(e) => setEditableSummary(e.target.value)}
              className="min-h-[300px] font-mono text-sm bg-background/50 resize-y whitespace-pre-wrap"
              placeholder="Resumen del documento..."
            />
          </div>

          {/* Metadata Section */}
          {metadata && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border/50">
              {/* Categories */}
              {metadata.categories.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Newspaper className="h-4 w-4" />
                    <span>Categorías Detectadas</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {metadata.categories.map((category, index) => (
                      <Badge 
                        key={index} 
                        variant="secondary"
                        className="bg-primary/10 text-primary hover:bg-primary/20"
                      >
                        {category}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Keywords */}
              {metadata.keywords.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Tag className="h-4 w-4" />
                    <span>Palabras Clave</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {metadata.keywords.slice(0, 15).map((keyword, index) => (
                      <Badge 
                        key={index} 
                        variant="outline"
                        className="text-xs"
                      >
                        {keyword}
                      </Badge>
                    ))}
                    {metadata.keywords.length > 15 && (
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        +{metadata.keywords.length - 15} más
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Relevant Clients */}
              {metadata.relevantClients.length > 0 && (
                <div className="space-y-2 md:col-span-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>Clientes Relevantes Detectados</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {metadata.relevantClients.map((client, index) => (
                      <Badge 
                        key={index} 
                        className="bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20"
                      >
                        {client}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* No clients detected message */}
              {metadata.relevantClients.length === 0 && (
                <div className="md:col-span-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>No se detectaron menciones de clientes configurados</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Legacy display for non-metadata summaries */}
          {!metadata && !hasStructuredFormat && (
            <p className="text-sm text-muted-foreground italic">
              Este documento fue procesado sin metadatos extendidos.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default DocumentSummaryCard;
