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
        if (matchedClients.length === 0) {
          console.log("[useTvNotifications] No matched clients, skipping alert (avoids FK violation)");
          return;
        }

        // Resolve client names → real client UUIDs (the previous code used user.id
        // as client_id, which violated the FK on client_alerts and silently failed).
        const { data: clientRows } = await supabase
          .from('clients')
          .select('id, name')
          .eq('is_active', true)
          .in('name', matchedClients);

        if (!clientRows || clientRows.length === 0) {
          console.warn("[useTvNotifications] Matched client names not found in DB:", matchedClients);
          return;
        }

        for (const c of clientRows) {
          await createNotification({
            client_id: c.id,
            title: `Análisis de contenido televisivo: ${category || 'Sin categoría'}`,
            description: `Cliente: ${c.name}`,
            content_type: "tv",
            importance_level: 4,
            keyword_matched: keywords,
            metadata: { category, matchedClients, relevantKeywords: keywords }
          });
        }
        console.log(`[useTvNotifications] Created ${clientRows.length} alert(s) for TV content analysis`);
      }
    } catch (notifyError) {
      console.error('Error creating notification:', notifyError);
    }
  };

  return {
    createAnalysisNotification
  };
};