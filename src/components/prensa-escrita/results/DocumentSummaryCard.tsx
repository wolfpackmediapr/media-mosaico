import React, { useState, useMemo } from "react";
import { FileText, Tag, Users, Newspaper, ChevronDown, ChevronUp, Copy, Check, MapPin, Calendar, UserCheck, HelpCircle, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DocumentMetadata } from "@/hooks/prensa/types";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface PressArticle {
  titulo: string;
  pagina?: number;
  seccion?: string;
  categoria?: string;
  resumen?: string;
  personas_mencionadas?: string[];
  organizaciones?: string[];
  relevancia_clientes?: string[];
}

interface StructuredAnalysis {
  resumen_ejecutivo: string;
  articulos: PressArticle[];
  analisis_5w: {
    quien: string;
    que: string;
    cuando: string;
    donde: string;
    por_que: string;
  } | null;
  temas_principales: string[];
}

interface DocumentSummaryCardProps {
  summary: string;
  metadata?: DocumentMetadata;
}

const DocumentSummaryCard = ({ summary, metadata }: DocumentSummaryCardProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isCopied, setIsCopied] = useState(false);

  // Try to parse structured data from summary
  const structured = useMemo<StructuredAnalysis | null>(() => {
    try {
      const parsed = JSON.parse(summary);
      if (parsed.resumen_ejecutivo || parsed.articulos) return parsed;
      return null;
    } catch {
      return null;
    }
  }, [summary]);

  const plainSummary = useMemo(() => {
    if (structured) {
      const lines: string[] = [];
      lines.push(`RESUMEN EJECUTIVO:\n${structured.resumen_ejecutivo}`);
      if (structured.articulos?.length) {
        lines.push(`\nARTÍCULOS (${structured.articulos.length}):`);
        structured.articulos.forEach((a, i) => {
          lines.push(`${i + 1}. ${a.titulo}${a.pagina ? ` (Pág. ${a.pagina})` : ''}: ${a.resumen || ''}`);
        });
      }
      if (structured.analisis_5w) {
        const w = structured.analisis_5w;
        lines.push(`\nANÁLISIS 5W:`);
        lines.push(`Quién: ${w.quien}`);
        lines.push(`Qué: ${w.que}`);
        lines.push(`Cuándo: ${w.cuando}`);
        lines.push(`Dónde: ${w.donde}`);
        lines.push(`Por qué: ${w.por_que}`);
      }
      return lines.join('\n');
    }
    return summary.replace(/\\n/g, '\n');
  }, [summary, structured]);

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(plainSummary);
      setIsCopied(true);
      toast.success("Análisis copiado al portapapeles");
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      toast.error("Error al copiar el texto");
    }
  };

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
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); handleCopyText(); }}
            className="h-8 gap-2"
          >
            {isCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            <span className="hidden sm:inline">{isCopied ? "Copiado" : "Copiar"}</span>
          </Button>
          <Button variant="ghost" size="sm">
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          {structured ? (
            <StructuredView structured={structured} />
          ) : (
            <LegacyView summary={summary} />
          )}

          {/* Metadata Section */}
          {metadata && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border/50">
              {metadata.categories.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Newspaper className="h-4 w-4" />
                    <span>Categorías Detectadas</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {metadata.categories.map((category, index) => (
                      <Badge key={index} variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">
                        {category}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {metadata.keywords.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Tag className="h-4 w-4" />
                    <span>Palabras Clave</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {metadata.keywords.slice(0, 15).map((keyword, index) => (
                      <Badge key={index} variant="outline" className="text-xs">{keyword}</Badge>
                    ))}
                    {metadata.keywords.length > 15 && (
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        +{metadata.keywords.length - 15} más
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {metadata.relevantClients.length > 0 && (
                <div className="space-y-2 md:col-span-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>Clientes Relevantes Detectados</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {metadata.relevantClients.map((client, index) => (
                      <Badge key={index} className="bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20">
                        {client}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

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
        </div>
      )}
    </div>
  );
};

/** Renders the new structured analysis */
const StructuredView = ({ structured }: { structured: StructuredAnalysis }) => {
  return (
    <div className="space-y-4">
      {/* Executive Summary */}
      <div className="bg-background/60 rounded-lg p-4 border border-border/50">
        <h4 className="text-sm font-semibold text-primary mb-2 flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          Resumen Ejecutivo
        </h4>
        <p className="text-sm leading-relaxed text-foreground whitespace-pre-line">
          {structured.resumen_ejecutivo}
        </p>
      </div>

      {/* Main Topics */}
      {structured.temas_principales?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-xs font-medium text-muted-foreground self-center">Temas:</span>
          {structured.temas_principales.map((tema, i) => (
            <Badge key={i} variant="secondary" className="bg-accent/50">{tema}</Badge>
          ))}
        </div>
      )}

      {/* Articles */}
      {structured.articulos?.length > 0 && (
        <Accordion type="single" collapsible defaultValue="articulos">
          <AccordionItem value="articulos" className="border border-border/50 rounded-lg overflow-hidden">
            <AccordionTrigger className="px-4 py-3 hover:bg-muted/50 text-sm font-semibold">
              <div className="flex items-center gap-2">
                <Newspaper className="h-4 w-4 text-primary" />
                Artículos Identificados ({structured.articulos.length})
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-0 pb-0">
              <div className="divide-y divide-border/30">
                {structured.articulos.map((art, i) => (
                  <div key={i} className="px-4 py-3 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{art.titulo}</span>
                          {art.pagina && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                              Pág. {art.pagina}
                            </Badge>
                          )}
                          {art.categoria && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary shrink-0">
                              {art.categoria}
                            </Badge>
                          )}
                        </div>
                        {art.resumen && (
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{art.resumen}</p>
                        )}
                        {(art.personas_mencionadas?.length || art.organizaciones?.length) ? (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {art.personas_mencionadas?.map((p, j) => (
                              <span key={`p-${j}`} className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                👤 {p}
                              </span>
                            ))}
                            {art.organizaciones?.map((o, j) => (
                              <span key={`o-${j}`} className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                🏢 {o}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}

      {/* 5W Analysis */}
      {structured.analisis_5w && (
        <Accordion type="single" collapsible>
          <AccordionItem value="5w" className="border border-border/50 rounded-lg overflow-hidden">
            <AccordionTrigger className="px-4 py-3 hover:bg-muted/50 text-sm font-semibold">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-primary" />
                Análisis 5W
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <div className="grid gap-3">
                <FiveWRow icon={<UserCheck className="h-4 w-4" />} label="Quién" value={structured.analisis_5w.quien} />
                <FiveWRow icon={<BookOpen className="h-4 w-4" />} label="Qué" value={structured.analisis_5w.que} />
                <FiveWRow icon={<Calendar className="h-4 w-4" />} label="Cuándo" value={structured.analisis_5w.cuando} />
                <FiveWRow icon={<MapPin className="h-4 w-4" />} label="Dónde" value={structured.analisis_5w.donde} />
                <FiveWRow icon={<HelpCircle className="h-4 w-4" />} label="Por qué" value={structured.analisis_5w.por_que} />
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </div>
  );
};

const FiveWRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => {
  if (!value) return null;
  return (
    <div className="flex gap-3">
      <div className="flex items-center gap-2 min-w-[80px] text-primary shrink-0">
        {icon}
        <span className="text-xs font-semibold">{label}</span>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{value}</p>
    </div>
  );
};

/** Fallback for legacy plain-text summaries */
const LegacyView = ({ summary }: { summary: string }) => {
  const formatted = summary.replace(/\\n/g, '\n');
  return (
    <div className="bg-background/60 rounded-lg p-4 border border-border/50">
      <p className="text-sm leading-relaxed whitespace-pre-line">{formatted}</p>
    </div>
  );
};

export default DocumentSummaryCard;
