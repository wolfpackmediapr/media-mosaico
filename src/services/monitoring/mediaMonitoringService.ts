
import { supabase } from "@/integrations/supabase/client";
import { createNotification } from "../notifications/unifiedNotificationService";
import { analyzeMediaContent } from "../notifications/mediaAnalysisService";
import { MonitoringTarget } from "@/hooks/monitoring/useMediaMonitoring";

/**
 * Media monitoring system service
 * Implements the end-to-end media monitoring workflow:
 * 1. Identify Brand/Topic
 * 2. Track Mentions
 * 3. Collect Data
 * 4. Analyze Media
 * 5. Identify Trends
 * 6. Take Action
 */

interface MonitoringSummary {
  totalMentions: number;
  mentionsBySource: Record<string, number>;
  mentionsByDay: { date: string; count: number }[];
  topKeywords: { keyword: string; count: number }[];
  clientImpact: { clientId: string; clientName: string; mentionCount: number }[];
}

// Create tables if necessary
async function ensureTablesExist() {
  // This function would typically be done via migrations but for this implementation
  // we'll assume the tables already exist or were created by the migration file
  return true;
}

/**
 * Creates a new monitoring target for a client, brand, or topic
 */
export const createMonitoringTarget = async (target: Omit<MonitoringTarget, 'id' | 'created_at' | 'updated_at'>) => {
  try {
    await ensureTablesExist();
    
    // For now, we'll simulate creating a monitoring target
    // In a real implementation, this would insert into the monitoring_targets table
    console.log("Creating monitoring target:", target);
    
    // Return a simulated response for now
    return {
      id: `target-${Date.now()}`,
      ...target,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error creating monitoring target:', error);
    throw error;
  }
};

/**
 * Gets all monitoring targets
 */
export const getMonitoringTargets = async (): Promise<MonitoringTarget[]> => {
  try {
    await ensureTablesExist();
    
    // For now, return simulated data
    // In a real implementation, this would query the monitoring_targets table
    return [
      {
        id: "target-1",
        name: "Proyecto de Infraestructura",
        type: "topic",
        keywords: ["infraestructura", "proyecto", "construcción", "desarrollo"],
        importance: 4,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: "target-2",
        name: "Empresa ABC",
        type: "client",
        keywords: ["ABC", "innovación", "tecnología"],
        importance: 5,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
  } catch (error) {
    console.error('Error fetching monitoring targets:', error);
    throw error;
  }
};

/**
 * Analyze media content for a specific monitoring target
 */
export const analyzeContentForTarget = async (
  contentId: string,
  contentType: "news" | "social" | "radio" | "tv" | "press",
  title: string,
  content: string,
  targetId: string
) => {
  try {
    // Get target details - in real implementation this would query the monitoring_targets table
    const target = {
      id: targetId,
      name: "Simulated Target",
      type: "client" as const,
      keywords: ["proyecto", "desarrollo", "tecnología"],
      client_id: "client-123"
    };
    
    // Check if content contains any of the target keywords
    const matchedKeywords = target.keywords.filter(keyword => 
      content.toLowerCase().includes(keyword.toLowerCase()) || 
      title.toLowerCase().includes(keyword.toLowerCase())
    );
    
    if (matchedKeywords.length === 0) {
      return { matched: false, message: 'No keywords matched' };
    }
    
    // Simulate analysis result
    const analysisResult = {
      sentiment: "positive",
      entities: ["Project X", "Company Y"],
      topics: ["Technology", "Development"]
    };
    
    // Simulate creating a mention record
    const mention = {
      id: `mention-${Date.now()}`,
      target_id: targetId,
      content_id: contentId,
      content_type: contentType,
      matched_keywords: matchedKeywords,
      analysis_result: analysisResult,
      importance: calculateImportance(matchedKeywords.length),
      created_at: new Date().toISOString()
    };
      
    // Simulate creating a notification about this mention
    if (target.type === 'client') {
      await createNotification({
        client_id: target.client_id || target.id,
        title: `Nueva mención para ${target.name}`,
        description: `Se han encontrado ${matchedKeywords.length} palabras clave en un nuevo ${getContentTypeDisplay(contentType)}`,
        content_id: contentId,
        content_type: contentType,
        keyword_matched: matchedKeywords,
        importance_level: calculateImportance(matchedKeywords.length),
        metadata: {
          contentTitle: title,
          matchCount: matchedKeywords.length,
          targetId: targetId
        }
      });
    }
    
    return { 
      matched: true, 
      mention: mention, 
      matchedKeywords 
    };
  } catch (error) {
    console.error('Error analyzing content for target:', error);
    throw error;
  }
};

/**
 * Run monitoring across all content for all targets
 */
export const runMonitoringScan = async () => {
  try {
    // Get simulated targets
    const targets = await getMonitoringTargets();
      
    // Simulate processing recent content
    const articles = [
      { id: "article-1", title: "New Infrastructure Project", content: "A new infrastructure development project...", description: "Project development news" },
      { id: "article-2", title: "Technology Innovation", content: "ABC company announces technology innovation...", description: "Company innovation" }
    ];
      
    const results = {
      processed: 0,
      matches: 0,
      notifications: 0
    };
    
    // Analyze each article for each target
    for (const article of articles) {
      results.processed++;
      
      for (const target of targets) {
        try {
          const result = await analyzeContentForTarget(
            article.id,
            'news',
            article.title,
            article.description || article.content || '',
            target.id
          );
          
          if (result.matched) {
            results.matches++;
            
            if (target.type === 'client') {
              results.notifications++;
            }
          }
        } catch (error) {
          console.error(`Error processing article ${article.id} for target ${target.id}:`, error);
        }
      }
    }
    
    return results;
  } catch (error) {
    console.error('Error running monitoring scan:', error);
    throw error;
  }
};

/**
 * Get monitoring summary for a specific target or all targets
 */
export const getMonitoringSummary = async (targetId?: string): Promise<MonitoringSummary> => {
  try {
    // Simulate mentions data
    const mentions = [
      { content_type: "news", created_at: new Date().toISOString(), matched_keywords: ["infraestructura", "desarrollo"] },
      { content_type: "news", created_at: new Date().toISOString(), matched_keywords: ["proyecto", "construcción"] },
      { content_type: "social", created_at: new Date().toISOString(), matched_keywords: ["ABC", "tecnología"] },
      { content_type: "radio", created_at: new Date(Date.now() - 86400000).toISOString(), matched_keywords: ["innovación"] },
      { content_type: "tv", created_at: new Date(Date.now() - 86400000 * 2).toISOString(), matched_keywords: ["desarrollo", "infraestructura"] }
    ];
    
    // Process mentions into summary format
    const summary: MonitoringSummary = {
      totalMentions: mentions.length,
      mentionsBySource: {},
      mentionsByDay: [],
      topKeywords: [],
      clientImpact: []
    };
    
    const keywordCounts: Record<string, number> = {};
    const dateMap = new Map<string, number>();
    
    mentions.forEach(mention => {
      // Count by source
      summary.mentionsBySource[mention.content_type] = 
        (summary.mentionsBySource[mention.content_type] || 0) + 1;
      
      // Count by day
      const date = new Date(mention.created_at).toISOString().split('T')[0];
      dateMap.set(date, (dateMap.get(date) || 0) + 1);
      
      // Count keywords
      if (mention.matched_keywords && Array.isArray(mention.matched_keywords)) {
        mention.matched_keywords.forEach(keyword => {
          keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
        });
      }
    });
    
    // Convert date map to array
    summary.mentionsByDay = Array.from(dateMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    // Convert keywords to array and sort
    summary.topKeywords = Object.entries(keywordCounts)
      .map(([keyword, count]) => ({ keyword, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
      
    // Sample client impact data
    summary.clientImpact = [
      { clientId: "client-1", clientName: "Empresa ABC", mentionCount: 3 },
      { clientId: "client-2", clientName: "Cliente XYZ", mentionCount: 2 }
    ];
    
    return summary;
  } catch (error) {
    console.error('Error getting monitoring summary:', error);
    throw error;
  }
};

/**
 * Helper functions
 */
const calculateImportance = (matchCount: number): number => {
  if (matchCount >= 5) return 5;
  if (matchCount >= 3) return 4;
  if (matchCount >= 2) return 3;
  return 2;
};

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
