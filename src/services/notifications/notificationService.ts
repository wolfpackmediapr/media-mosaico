
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
 * Send a notification via Supabase Edge Function
 */
export const sendNotification = async (notificationData: NotificationData) => {
  try {
    const { data, error } = await supabase.functions.invoke("process-notifications", {
      body: notificationData,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error sending notification:", error);
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
        await sendNotification({
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
    console.error("Error generating keyword notifications:", error);
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
