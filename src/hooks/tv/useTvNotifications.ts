import { supabase } from "@/integrations/supabase/client";
import { createNotification } from "@/services/notifications/unifiedNotificationService";

export const useTvNotifications = () => {
  const createAnalysisNotification = async (analysisData: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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
      
      if (category || keywords.length > 0 || matchedClients.length > 0) {
        await createNotification({
          client_id: user.id,
          title: `Análisis de contenido televisivo: ${category || 'Sin categoría'}`,
          description: `${matchedClients.length > 0 ? 'Clientes: ' + matchedClients.join(', ') : ''}`,
          content_type: "tv",
          importance_level: matchedClients.length > 0 ? 4 : 3,
          keyword_matched: keywords,
          metadata: {
            category,
            matchedClients,
            relevantKeywords: keywords
          }
        });
        console.log("Created notification for TV content analysis");
      }
    } catch (notifyError) {
      console.error('Error creating notification:', notifyError);
    }
  };

  return {
    createAnalysisNotification
  };
};