
import { supabase } from "@/integrations/supabase/client";
import { createNotification } from "../notifications/unifiedNotificationService";
import { analyzeMediaContent } from "../notifications/mediaAnalysisService";
import { MonitoringTarget } from "@/hooks/monitoring/useMediaMonitoring";
import { fetchCategories } from "@/pages/configuracion/categories/categoriesService";
import { fetchClients } from "@/services/clients/clientService";
import { CustomDatabase } from "@/integrations/supabase/schema";

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

/**
 * Creates a new monitoring target for a client, brand, or topic
 */
export const createMonitoringTarget = async (target: Omit<MonitoringTarget, 'id' | 'created_at' | 'updated_at'>) => {
  try {
    const { data, error } = await supabase
      .from('monitoring_targets')
      .insert(target)
      .select()
      .single();
      
    if (error) throw error;
    return data;
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
    const { data, error } = await supabase
      .from('monitoring_targets')
      .select(`
        id,
        name, 
        type,
        keywords,
        categories,
        importance,
        client_id,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // If no data, return empty array
    if (!data) return [];
    
    // Get client names for targets with client_id
    const targetsWithClients = [];
    
    for (const target of data) {
      let clientName = null;
      
      if (target.client_id) {
        // Fetch client info
        const { data: clientData } = await supabase
          .from('clients')
          .select('name')
          .eq('id', target.client_id)
          .single();
          
        if (clientData) {
          clientName = clientData.name;
        }
      }
      
      // Add the client name to the target object
      targetsWithClients.push({
        ...target,
        clientName
      });
    }
    
    return targetsWithClients;
  } catch (error) {
    console.error('Error fetching monitoring targets:', error);
    throw error;
  }
};

/**
 * Gets available categories for monitoring targets
 */
export const getAvailableCategories = async () => {
  try {
    // Use the existing categories service
    const categories = await fetchCategories();
    return categories.map(cat => ({ 
      id: cat.id, 
      name: cat.name_es || cat.name_en 
    }));
  } catch (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }
};

/**
 * Gets available clients for monitoring targets
 */
export const getAvailableClients = async () => {
  try {
    // Use the existing clients service
    const { data } = await fetchClients();
    return data.map(client => ({ 
      id: client.id, 
      name: client.name,
      keywords: client.keywords || []
    }));
  } catch (error) {
    console.error('Error fetching clients:', error);
    throw error;
  }
};

/**
 * Delete a monitoring target
 */
export const deleteMonitoringTarget = async (id: string) => {
  try {
    const { error } = await supabase
      .from('monitoring_targets')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting monitoring target:', error);
    throw error;
  }
};

/**
 * Update a monitoring target
 */
export const updateMonitoringTarget = async (id: string, updates: Partial<MonitoringTarget>) => {
  try {
    const { data, error } = await supabase
      .from('monitoring_targets')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating monitoring target:', error);
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
    const { data: target, error } = await supabase
      .from('monitoring_targets')
      .select(`
        id,
        name,
        type,
        keywords,
        client_id,
        importance
      `)
      .eq('id', targetId)
      .single();
    
    if (error) throw error;
    
    if (!target) {
      return { matched: false, message: 'Target not found' };
    }
    
    // Check if content contains any of the target keywords
    const matchedKeywords = Array.isArray(target.keywords) 
      ? target.keywords.filter(keyword => 
          content.toLowerCase().includes(keyword.toLowerCase()) || 
          title.toLowerCase().includes(keyword.toLowerCase())
        )
      : [];
    
    if (matchedKeywords.length === 0) {
      return { matched: false, message: 'No keywords matched' };
    }
    
    // Get analysis result
    const analysisResult = await analyzeMediaContent({
      contentId,
      contentType,
      title,
      content
    });
    
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
    if (target.type === 'client' && target.client_id) {
      // Get client name
      const { data: clientData } = await supabase
        .from('clients')
        .select('name')
        .eq('id', target.client_id)
        .single();
      
      if (clientData) {
        await createNotification({
          client_id: target.client_id,
          title: `Nueva mención para ${clientData.name || target.name}`,
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
    // Get targets
    const targets = await getMonitoringTargets();
      
    // Get recent news articles
    const { data: articlesData, error: articlesError } = await supabase
      .from('news_articles')
      .select('id, title, description')
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (articlesError) throw articlesError;
    
    // Check if articlesData is defined before processing
    const articles = articlesData || [];
      
    const results = {
      processed: 0,
      matches: 0,
      notifications: 0
    };
    
    // Analyze each article for each target
    if (articles.length > 0) {
      for (const article of articles) {
        if (!article || !article.id) {
          console.warn('Invalid article found, skipping');
          continue;
        }

        results.processed++;
        
        // Mark the article as processed
        try {
          const { error: updateError } = await supabase
            .from('news_articles')
            .update({ last_processed: new Date().toISOString() })
            .eq('id', article.id);
          
          if (updateError) {
            console.error(`Error updating article ${article.id}:`, updateError);
            continue;
          }
        } catch (updateError) {
          console.error(`Error updating article ${article.id}:`, updateError);
          continue;
        }
        
        for (const target of targets) {
          try {
            const articleTitle = article.title || "";
            const articleContent = article.description || "";
            
            if (!target.id) {
              console.warn('Invalid target found, skipping');
              continue;
            }

            const result = await analyzeContentForTarget(
              article.id,
              'news',
              articleTitle,
              articleContent,
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
    }
    
    // Get press clippings if available
    try {
      const { data: pressClippingsData, error: pressError } = await supabase
        .from('press_clippings')
        .select('id, title, content, publication_name')
        .order('created_at', { ascending: false })
        .limit(10);
      
      // Check if pressClippingsData is defined before processing
      const pressClippings = pressClippingsData || [];
      
      if (!pressError && pressClippings.length > 0) {
        for (const clipping of pressClippings) {
          if (!clipping || !clipping.id) {
            console.warn('Invalid press clipping found, skipping');
            continue;
          }

          results.processed++;
          
          // Mark the clipping as processed
          try {
            await supabase
              .from('press_clippings')
              .update({ updated_at: new Date().toISOString() })
              .eq('id', clipping.id);
          } catch (updateError) {
            console.error(`Error updating clipping ${clipping.id}:`, updateError);
            continue;
          }
          
          for (const target of targets) {
            try {
              if (!target.id) {
                console.warn('Invalid target found, skipping');
                continue;
              }

              const result = await analyzeContentForTarget(
                clipping.id,
                'press',
                clipping.title || "",
                clipping.content || "",
                target.id
              );
              
              if (result.matched) {
                results.matches++;
                
                if (target.type === 'client') {
                  results.notifications++;
                }
              }
            } catch (error) {
              console.error(`Error processing clipping ${clipping.id} for target ${target.id}:`, error);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error processing press clippings:', error);
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
    // In a real implementation, this would query the target_mentions table
    // For now, return simulated data that's more comprehensive
    
    // Get actual client data for more realistic results
    const { data: clients } = await supabase
      .from('clients')
      .select('id, name')
      .limit(5);
    
    // Simulated mentions data with real client information
    const mentions = [
      { content_type: "news", created_at: new Date().toISOString(), matched_keywords: ["infraestructura", "desarrollo"] },
      { content_type: "news", created_at: new Date().toISOString(), matched_keywords: ["proyecto", "construcción"] },
      { content_type: "social", created_at: new Date().toISOString(), matched_keywords: ["innovación", "tecnología"] },
      { content_type: "radio", created_at: new Date(Date.now() - 86400000).toISOString(), matched_keywords: ["innovación"] },
      { content_type: "tv", created_at: new Date(Date.now() - 86400000 * 2).toISOString(), matched_keywords: ["desarrollo", "infraestructura"] },
      { content_type: "press", created_at: new Date(Date.now() - 86400000 * 3).toISOString(), matched_keywords: ["política", "gobierno"] },
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
      
    // Use real client data for impact
    if (clients) {
      summary.clientImpact = clients.map((client, index) => ({
        clientId: client.id,
        clientName: client.name,
        mentionCount: Math.floor(Math.random() * 5) + 1 // Simulate 1-5 mentions per client
      })).sort((a, b) => b.mentionCount - a.mentionCount);
    }
    
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
