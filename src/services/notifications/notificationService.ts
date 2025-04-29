
import { supabase } from "@/integrations/supabase/client";

export interface NotificationData {
  client_id: string;
  title: string;
  description?: string;
  content_id?: string;
  content_type?: "news" | "social" | "radio" | "tv" | "press";
  keyword_matched?: string[];
  importance_level?: number;
  metadata?: Record<string, any>;
}

/**
 * Create a notification in the client_alerts table
 */
export const createNotification = async (notificationData: NotificationData) => {
  try {
    // First check if client exists to avoid foreign key constraint error
    const { data: clientExists, error: clientCheckError } = await supabase
      .from("clients")
      .select("id")
      .eq("id", notificationData.client_id)
      .maybeSingle();
    
    if (clientCheckError) {
      console.error("Error al verificar cliente:", clientCheckError);
      throw clientCheckError;
    }
    
    // If client doesn't exist, log warning and skip notification creation
    if (!clientExists) {
      console.warn(`Omitiendo creación de notificación: Cliente con ID ${notificationData.client_id} no encontrado`);
      return null;
    }
    
    // Calculate priority based on importance level
    const priority = calculatePriorityFromImportance(notificationData.importance_level || 3);
    
    const { data, error } = await supabase
      .from("client_alerts")
      .insert({
        client_id: notificationData.client_id,
        title: notificationData.title,
        description: notificationData.description,
        content_id: notificationData.content_id,
        content_type: notificationData.content_type,
        keyword_matched: notificationData.keyword_matched,
        importance_level: notificationData.importance_level || 3,
        status: "unread",
        priority: priority,
        metadata: notificationData.metadata
      })
      .select();

    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error("Error al crear notificación:", error);
    throw error;
  }
};

/**
 * Generate notifications for new content mentioning client keywords
 */
export const generateKeywordNotifications = async (
  contentId: string,
  contentType: "news" | "social" | "radio" | "tv" | "press",
  title: string,
  content: string,
  keywords?: string[]
) => {
  try {
    // Skip if no keywords to match
    if (!keywords || keywords.length === 0) return;

    // Fetch all clients with their keywords
    const { data: clients, error } = await supabase
      .from("clients")
      .select("id, name, keywords")
      .not("keywords", "is", null);

    if (error) throw error;

    // Check each client's keywords against the content
    for (const client of clients) {
      if (!client.keywords || client.keywords.length === 0) continue;

      // Find matching keywords
      const matchedKeywords = client.keywords.filter((keyword: string) => 
        content.toLowerCase().includes(keyword.toLowerCase()) || 
        title.toLowerCase().includes(keyword.toLowerCase())
      );

      // If we have matches, create a notification
      if (matchedKeywords.length > 0) {
        await createNotification({
          client_id: client.id,
          title: `Nuevo contenido con menciones de ${client.name}`,
          description: `Se han encontrado ${matchedKeywords.length} palabras clave en un nuevo ${getContentTypeDisplay(contentType)}`,
          content_id: contentId,
          content_type: contentType,
          keyword_matched: matchedKeywords,
          importance_level: calculateImportance(matchedKeywords.length),
          metadata: {
            contentTitle: title,
            matchCount: matchedKeywords.length
          }
        });
      }
    }
  } catch (error) {
    console.error("Error generando notificaciones de palabras clave:", error);
    throw error;
  }
};

/**
 * Calculate importance level based on number of matches
 */
const calculateImportance = (matchCount: number): number => {
  if (matchCount >= 5) return 5;
  if (matchCount >= 3) return 4;
  if (matchCount >= 2) return 3;
  return 2;
};

/**
 * Calculate priority string from importance level
 */
const calculatePriorityFromImportance = (importance: number): string => {
  if (importance >= 5) return "urgent";
  if (importance >= 4) return "high";
  if (importance >= 3) return "medium";
  return "low";
};

/**
 * Get display name for content type
 */
const getContentTypeDisplay = (contentType: string): string => {
  const map: Record<string, string> = {
    "news": "artículo de noticias",
    "social": "publicación en redes sociales",
    "radio": "segmento de radio",
    "tv": "segmento de TV",
    "press": "recorte de prensa"
  };
  return map[contentType] || contentType;
};
