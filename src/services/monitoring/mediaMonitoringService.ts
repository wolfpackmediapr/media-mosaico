
import { supabase } from "@/integrations/supabase/client";
import { createNotification } from "../notifications/unifiedNotificationService";
import { analyzeMediaContent } from "../notifications/mediaAnalysisService";

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

interface MonitoringTarget {
  id: string;
  name: string;
  type: 'client' | 'topic' | 'brand';
  keywords: string[];
  categories?: string[];
  importance?: number;
}

interface MonitoringSummary {
  totalMentions: number;
  mentionsBySource: Record<string, number>;
  mentionsByDay: { date: string; count: number }[];
  topKeywords: { keyword: string; count: number }[];
  clientImpact: { clientId: string; clientName: string; mentionCount: number }[];
}

/**
 * Creates a new monitoring target for a client, brand, or topic
 */
export const createMonitoringTarget = async (target: Omit<MonitoringTarget, 'id'>) => {
  try {
    const { data, error } = await supabase
      .from('monitoring_targets')
      .insert({
        name: target.name,
        type: target.type,
        keywords: target.keywords,
        categories: target.categories || [],
        importance: target.importance || 3
      })
      .select();

    if (error) throw error;
    
    return data[0];
  } catch (error) {
    console.error('Error creating monitoring target:', error);
    throw error;
  }
};

/**
 * Gets all monitoring targets
 */
export const getMonitoringTargets = async () => {
  try {
    const { data, error } = await supabase
      .from('monitoring_targets')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    return data;
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
    // Get target details
    const { data: target, error: targetError } = await supabase
      .from('monitoring_targets')
      .select('*')
      .eq('id', targetId)
      .single();

    if (targetError) throw targetError;
    
    // Check if content contains any of the target keywords
    const matchedKeywords = target.keywords.filter(keyword => 
      content.toLowerCase().includes(keyword.toLowerCase()) || 
      title.toLowerCase().includes(keyword.toLowerCase())
    );
    
    if (matchedKeywords.length === 0) {
      return { matched: false, message: 'No keywords matched' };
    }
    
    // Analyze the content
    const analysisResult = await analyzeMediaContent({
      contentId,
      contentType,
      title,
      content
    });
    
    // Create a record of this mention
    const { data: mention, error: mentionError } = await supabase
      .from('target_mentions')
      .insert({
        target_id: targetId,
        content_id: contentId,
        content_type: contentType,
        matched_keywords: matchedKeywords,
        analysis_result: analysisResult,
        importance: calculateImportance(matchedKeywords.length)
      })
      .select();
      
    if (mentionError) throw mentionError;
    
    // Create notification about this mention
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
      mention: mention[0], 
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
    // Get all targets
    const { data: targets, error: targetsError } = await supabase
      .from('monitoring_targets')
      .select('*')
      .eq('active', true);
      
    if (targetsError) throw targetsError;
    
    // Get content from the last 24 hours that hasn't been processed yet
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    
    // Process news articles
    const { data: articles, error: articlesError } = await supabase
      .from('news_articles')
      .select('id, title, description, content')
      .gt('created_at', oneDayAgo.toISOString())
      .is('last_monitored', null);
      
    if (articlesError) throw articlesError;
    
    const results = {
      processed: 0,
      matches: 0,
      notifications: 0
    };
    
    // Analyze each article for each target
    for (const article of (articles || [])) {
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
      
      // Mark article as monitored
      await supabase
        .from('news_articles')
        .update({ last_monitored: new Date().toISOString() })
        .eq('id', article.id);
    }
    
    // Similar process would be applied for other content types (radio, tv, etc.)
    
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
    let query = supabase
      .from('target_mentions')
      .select('*, monitoring_targets(name)');
    
    if (targetId) {
      query = query.eq('target_id', targetId);
    }
    
    const { data: mentions, error } = await query;
    
    if (error) throw error;
    
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
