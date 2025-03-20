
import { supabase } from "@/integrations/supabase/client";
import { createNotification } from "./notificationService";

interface MediaAnalysisResult {
  category: string;
  matched_clients: string[];
  summary: string;
  relevant_keywords: string[];
}

export interface MediaContentToAnalyze {
  contentId: string;
  contentType: "news" | "social" | "radio" | "tv" | "press";
  title: string; 
  content: string;
}

/**
 * Analyze media content and generate notifications for matched clients
 */
export const analyzeMediaContent = async (mediaContent: MediaContentToAnalyze): Promise<MediaAnalysisResult> => {
  try {
    // Call Supabase Edge Function to analyze the content
    const { data, error } = await supabase.functions.invoke("analyze-media-content", {
      body: {
        title: mediaContent.title,
        content: mediaContent.content,
        contentType: mediaContent.contentType,
      }
    });

    if (error) throw error;

    const analysisResult: MediaAnalysisResult = data;

    // For each matched client, create a notification
    if (analysisResult.matched_clients && analysisResult.matched_clients.length > 0) {
      // Get client IDs from client names
      const { data: clientsData, error: clientsError } = await supabase
        .from("clients")
        .select("id, name")
        .in("name", analysisResult.matched_clients);

      if (clientsError) throw clientsError;

      // Create notifications for each matched client
      for (const client of clientsData) {
        await createNotification({
          client_id: client.id,
          title: `Nuevo contenido relevante: ${analysisResult.category}`,
          description: analysisResult.summary,
          content_id: mediaContent.contentId,
          content_type: mediaContent.contentType,
          keyword_matched: analysisResult.relevant_keywords,
          importance_level: calculateImportanceByMatchCount(analysisResult.matched_clients.length, analysisResult.relevant_keywords.length),
          metadata: {
            category: analysisResult.category,
            matchedClients: analysisResult.matched_clients,
            relevantKeywords: analysisResult.relevant_keywords
          }
        });
      }
    }

    return analysisResult;
  } catch (error) {
    console.error("Error analyzing media content:", error);
    throw error;
  }
};

/**
 * Calculate importance level based on match counts
 */
const calculateImportanceByMatchCount = (clientMatchCount: number, keywordMatchCount: number): number => {
  // More clients matched = higher importance
  if (clientMatchCount >= 3) return 5; // Very important - multiple clients
  if (clientMatchCount >= 2) return 4; // Important - multiple clients
  
  // Single client but many keyword matches
  if (keywordMatchCount >= 5) return 4; // Important - many keywords
  if (keywordMatchCount >= 3) return 3; // Moderately important
  
  return 2; // Standard importance
};
