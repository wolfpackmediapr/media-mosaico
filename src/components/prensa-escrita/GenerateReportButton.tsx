
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { toast } from "@/services/toastService";
import { supabase } from "@/integrations/supabase/client";

interface PressClipping {
  id: string;
  title: string;
  content: string;
  category: string;
  pageNumber: number;
  summary?: {
    who: string;
    what: string;
    when: string;
    where: string;
    why: string;
  };
  keywords?: string[];
  clientRelevance?: string[];
  publicationName?: string;
}

interface GenerateReportButtonProps {
  clippings: PressClipping[];
  publicationName: string;
}

const GenerateReportButton = ({
  clippings,
  publicationName
}: GenerateReportButtonProps) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateReport = async () => {
    if (clippings.length === 0) {
      toast.error("Sin recortes", {
        description: "No hay recortes para generar un reporte"
      });
      return;
    }

    setIsGenerating(true);
    try {
      // Group clippings by client
      const clientClippings: Record<string, PressClipping[]> = {};
      
      clippings.forEach(clipping => {
        if (clipping.clientRelevance && clipping.clientRelevance.length > 0) {
          clipping.clientRelevance.forEach(client => {
            if (!clientClippings[client]) {
              clientClippings[client] = [];
            }
            clientClippings[client].push(clipping);
          });
        }
      });

      // Generate report content
      const reportText = `
INFORME DE PRENSA ESCRITA: ${publicationName}
===============================================

ÍNDICE
------
1. Resumen de Recortes
2. Secciones Específicas por Cliente
3. Análisis por Categoría

RESUMEN DE RECORTES
-------------------
${clippings.map(clip => `
TÍTULO: ${clip.title}
CATEGORÍA: ${clip.category}
PÁGINA: ${clip.pageNumber}
RELEVANCIA PARA CLIENTES: ${clip.clientRelevance?.join(', ') || 'Ninguno'}

RESUMEN DEL CONTENIDO:
- ¿Quién?: ${clip.summary?.who || 'N/A'}
- ¿Qué?: ${clip.summary?.what || 'N/A'}
- ¿Cuándo?: ${clip.summary?.when || 'N/A'}
- ¿Dónde?: ${clip.summary?.where || 'N/A'}
- ¿Por qué?: ${clip.summary?.why || 'N/A'}

PALABRAS CLAVE: ${clip.keywords?.join(', ') || 'N/A'}
`).join('\n' + '-'.repeat(50) + '\n')}

SECCIONES ESPECÍFICAS POR CLIENTE
--------------------------------
${Object.entries(clientClippings).length > 0 
  ? Object.entries(clientClippings).map(([client, clips]) => `
${client.toUpperCase()}
${'-'.repeat(client.length)}
${clips.map(clip => `- ${clip.title} (Página ${clip.pageNumber})`).join('\n')}
`).join('\n\n')
  : 'No se identificaron recortes relevantes para clientes específicos.'
}

ANÁLISIS POR CATEGORÍA
----------------------
${Object.entries(clippings.reduce((acc, clip) => {
  if (!acc[clip.category]) {
    acc[clip.category] = [];
  }
  acc[clip.category].push(clip);
  return acc;
}, {} as Record<string, PressClipping[]>)).map(([category, clips]) => `
${category}
${'-'.repeat(category.length)}
Total de recortes: ${clips.length}
Recortes: ${clips.map(c => c.title).join(', ')}
`).join('\n\n')}

Informe generado: ${new Date().toLocaleString('es-ES')}
`;

      // Create a blob and download the report
      const blob = new Blob([reportText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Informe_${publicationName.replace(/\s+/g, '_')}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Reporte generado", {
        description: "El informe ha sido generado exitosamente"
      });
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("Error al generar el reporte", {
        description: "No se pudo generar el informe"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button 
      onClick={generateReport} 
      disabled={isGenerating || clippings.length === 0}
      className="w-full md:w-auto"
    >
      {isGenerating ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Generando informe...
        </>
      ) : (
        <>
          <Download className="mr-2 h-4 w-4" />
          Generar informe
        </>
      )}
    </Button>
  );
};

export default GenerateReportButton;
