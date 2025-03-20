
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useMediaAnalysis } from "@/hooks/notifications/use-media-analysis";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

const MediaAnalysisTestPanel = () => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [contentType, setContentType] = useState<"news" | "social" | "radio" | "tv" | "press">("news");
  const { analyzeContent, isAnalyzing, analysisResult } = useMediaAnalysis();

  const handleAnalyze = async () => {
    if (!title || !content) return;
    
    // Use a mock ID for testing purposes
    const mockContentId = "test-" + Math.random().toString(36).substring(2, 15);
    
    await analyzeContent(mockContentId, contentType, title, content);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Prueba de Análisis de Contenido</CardTitle>
        <CardDescription>
          Ingrese contenido para analizarlo y generar notificaciones relevantes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="content-type">Tipo de Contenido</Label>
          <Select 
            value={contentType} 
            onValueChange={(value) => setContentType(value as any)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccione un tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="news">Noticias</SelectItem>
              <SelectItem value="social">Redes Sociales</SelectItem>
              <SelectItem value="radio">Radio</SelectItem>
              <SelectItem value="tv">Televisión</SelectItem>
              <SelectItem value="press">Prensa Escrita</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="title">Título</Label>
          <Input
            id="title"
            placeholder="Ingrese el título del contenido"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="content">Contenido</Label>
          <Textarea
            id="content"
            placeholder="Ingrese el contenido a analizar"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={5}
          />
        </div>
        
        <Button 
          onClick={handleAnalyze}
          disabled={isAnalyzing || !title || !content}
          className="w-full"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analizando...
            </>
          ) : (
            "Analizar Contenido"
          )}
        </Button>
        
        {analysisResult && (
          <div className="mt-6 p-4 border rounded-md bg-muted">
            <h3 className="text-lg font-medium mb-2">Resultado del Análisis</h3>
            <div className="space-y-2 text-sm">
              <p><span className="font-semibold">Categoría:</span> {analysisResult.category}</p>
              <p><span className="font-semibold">Clientes Relevantes:</span> {analysisResult.matched_clients.join(", ") || "Ninguno"}</p>
              <p><span className="font-semibold">Palabras Clave:</span> {analysisResult.relevant_keywords.join(", ")}</p>
              <div>
                <p className="font-semibold">Resumen:</p>
                <p className="text-muted-foreground">{analysisResult.summary}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MediaAnalysisTestPanel;
