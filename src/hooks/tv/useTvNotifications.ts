import { createClientMatchNotifications } from "@/services/notifications/createClientMatchNotifications";

export const useTvNotifications = () => {
  const createAnalysisNotification = async (analysisData: string, contentId?: string) => {
    try {
      let category = "";
      let keywords: string[] = [];
      let matchedClients: string[] = [];
      
      const categoryMatch = analysisData.match(/Categoría[s]?:?\s*([A-ZÁ-ÚÑ\s&]+)/i);
      if (categoryMatch && categoryMatch[1]) {
        category = categoryMatch[1].trim();
      }
      
      const keywordsMatch = analysisData.match(/Palabras clave:?\s*([^\.]+)/i);
      if (keywordsMatch && keywordsMatch[1]) {
        keywords = keywordsMatch[1].split(',').map((k: string) => k.trim()).filter(Boolean);
      }
      
      const clientsMatch = analysisData.match(/Clientes [^:]*:?\s*([^\.]+)/i);
      if (clientsMatch && clientsMatch[1]) {
        matchedClients = clientsMatch[1].split(',').map((c: string) => c.trim()).filter(Boolean);
      }
      
      if (matchedClients.length > 0) {
        const res = await createClientMatchNotifications({
          matchedClients,
          title: (name) => `Mención en TV: ${name}${category ? ` (${category})` : ''}`,
          description: `Análisis de contenido televisivo${category ? ` — ${category}` : ''}`,
          content_id: contentId,
          content_type: "tv",
          importance_level: 4,
          keyword_matched: keywords,
          metadata: { category, matchedClients, relevantKeywords: keywords },
        });
        console.log("[useTvNotifications] Client-match notifications:", res);
      }
    } catch (notifyError) {
      console.error('Error creating notification:', notifyError);
    }
  };

  return {
    createAnalysisNotification
  };
};