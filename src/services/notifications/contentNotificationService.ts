
import { supabase } from "@/integrations/supabase/client";
import { analyzeMediaContent } from "./mediaAnalysisService";

/**
 * Schedule content processing by creating a job in the content_processing_jobs table
 */
export const scheduleContentProcessing = async () => {
  try {
    const { data, error } = await supabase
      .from("content_processing_jobs")
      .insert({
        status: "pending",
        content_type: "batch",
        content_id: "00000000-0000-0000-0000-000000000000"
      })
      .select();

    if (error) throw error;
    
    // Trigger edge function to process the job
    const { data: processingResult, error: processingError } = await supabase.functions.invoke(
      "process_content_notifications", 
      { body: { job_id: data[0].id } }
    );
    
    if (processingError) throw processingError;
    
    return processingResult;
  } catch (error) {
    console.error("Error scheduling content processing:", error);
    throw error;
  }
};

/**
 * Process a specific content item
 */
export const processContentItem = async (contentId: string, contentType: string) => {
  try {
    // Create a processing job
    const { data: job, error: jobError } = await supabase
      .from("content_processing_jobs")
      .insert({
        content_id: contentId,
        content_type: contentType,
        status: "pending"
      })
      .select();

    if (jobError) throw jobError;
    
    // Trigger the job processing
    const { data, error } = await supabase.functions.invoke(
      "process_content_notifications", 
      { body: { job_id: job[0].id } }
    );
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error("Error processing content item:", error);
    throw error;
  }
};

/**
 * Analyze and generate notifications for a piece of content directly
 */
export const analyzeAndNotify = async (
  contentId: string, 
  contentType: "news" | "social" | "radio" | "tv" | "press",
  title: string, 
  content: string
) => {
  try {
    // Use the media analysis service to analyze and create notifications
    const analysisResult = await analyzeMediaContent({
      contentId,
      contentType,
      title,
      content
    });
    
    return {
      success: true,
      analysis: analysisResult,
    };
  } catch (error) {
    console.error("Error in analyze and notify:", error);
    throw error;
  }
};

/**
 * Get content processing jobs with filtering and pagination
 */
export const getContentProcessingJobs = async ({
  status,
  limit = 10,
  page = 0
}: {
  status?: "pending" | "processing" | "completed" | "failed";
  limit?: number;
  page?: number;
}) => {
  try {
    let query = supabase
      .from("content_processing_jobs")
      .select("*", { count: "exact" });
    
    if (status) {
      query = query.eq("status", status);
    }
    
    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(page * limit, (page * limit) + limit - 1);
    
    if (error) throw error;
    
    return {
      data,
      count,
      page,
      limit
    };
  } catch (error) {
    console.error("Error fetching content processing jobs:", error);
    throw error;
  }
};

/**
 * Get notification delivery logs with pagination
 */
export const getNotificationDeliveryLogs = async ({
  limit = 10,
  page = 0
}: {
  limit?: number;
  page?: number;
}) => {
  try {
    const { data, error, count } = await supabase
      .from("notification_delivery_log")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(page * limit, (page * limit) + limit - 1);
    
    if (error) throw error;
    
    return {
      data,
      count,
      page,
      limit
    };
  } catch (error) {
    console.error("Error fetching notification delivery logs:", error);
    throw error;
  }
};

/**
 * Get notification analytics data
 */
export const getNotificationAnalytics = async () => {
  try {
    // Get total count
    const { count: totalCount, error: countError } = await supabase
      .from("client_alerts")
      .select("*", { count: "exact", head: true });
    
    if (countError) throw countError;
    
    // Get volume by day (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: volumeData, error: volumeError } = await supabase
      .from("client_alerts")
      .select("created_at")
      .gte("created_at", thirtyDaysAgo.toISOString());
    
    if (volumeError) throw volumeError;
    
    // Process volume data by day
    const volumeByDay = processVolumeByDay(volumeData);
    
    // Get most common keywords
    const { data: keywordsData, error: keywordsError } = await supabase
      .from("client_alerts")
      .select("keyword_matched");
    
    if (keywordsError) throw keywordsError;
    
    // Process keywords data
    const topKeywords = processKeywords(keywordsData);
    
    // Get distribution by source
    const { data: sourceData, error: sourceError } = await supabase
      .from("client_alerts")
      .select("content_type");
    
    if (sourceError) throw sourceError;
    
    // Process source distribution
    const sourceDistribution = processSourceDistribution(sourceData);
    
    // Get client engagement data
    const { data: clientData, error: clientError } = await supabase
      .from("client_alerts")
      .select("client_id, status");
    
    if (clientError) throw clientError;
    
    // Process client engagement
    const clientEngagement = await processClientEngagement(clientData);
    
    return {
      data: {
        totalCount,
        volumeByDay,
        topKeywords,
        sourceDistribution,
        clientEngagement
      }
    };
  } catch (error) {
    console.error("Error fetching notification analytics:", error);
    throw error;
  }
};

/**
 * Test notification settings
 */
export const testNotificationSettings = async (settings: any) => {
  try {
    // Call edge function to test notification settings
    const { data, error } = await supabase.functions.invoke(
      "test_notification_settings",
      { body: settings }
    );
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error("Error testing notification settings:", error);
    throw error;
  }
};

// Helper functions for analytics processing

const processVolumeByDay = (data: any[]) => {
  const volumeMap = new Map<string, number>();
  
  // Initialize last 30 days with 0
  for (let i = 0; i < 30; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateString = date.toISOString().split("T")[0];
    volumeMap.set(dateString, 0);
  }
  
  // Count notifications by day
  data.forEach(item => {
    const dateString = new Date(item.created_at).toISOString().split("T")[0];
    const count = volumeMap.get(dateString) || 0;
    volumeMap.set(dateString, count + 1);
  });
  
  // Convert to array for chart
  return Array.from(volumeMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
};

const processKeywords = (data: any[]) => {
  const keywordCounts = new Map<string, number>();
  
  // Count keyword occurrences
  data.forEach(item => {
    if (item.keyword_matched && Array.isArray(item.keyword_matched)) {
      item.keyword_matched.forEach((keyword: string) => {
        const count = keywordCounts.get(keyword) || 0;
        keywordCounts.set(keyword, count + 1);
      });
    }
  });
  
  // Convert to array and sort by count
  return Array.from(keywordCounts.entries())
    .map(([keyword, count]) => ({ keyword, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10); // Top 10 keywords
};

const processSourceDistribution = (data: any[]) => {
  const sourceCounts = new Map<string, number>();
  
  // Count sources
  data.forEach(item => {
    if (item.content_type) {
      const count = sourceCounts.get(item.content_type) || 0;
      sourceCounts.set(item.content_type, count + 1);
    }
  });
  
  // Convert to array
  return Array.from(sourceCounts.entries())
    .map(([source, count]) => ({ source, count }));
};

const processClientEngagement = async (data: any[]) => {
  const clientStats = new Map<string, { total: number, read: number }>();
  
  // Tally client stats
  data.forEach(item => {
    if (item.client_id) {
      const stats = clientStats.get(item.client_id) || { total: 0, read: 0 };
      stats.total += 1;
      if (item.status === "read") {
        stats.read += 1;
      }
      clientStats.set(item.client_id, stats);
    }
  });
  
  // Get client names
  const clientIds = Array.from(clientStats.keys());
  if (clientIds.length === 0) return [];
  
  const { data: clientsData, error } = await supabase
    .from("clients")
    .select("id, name")
    .in("id", clientIds);
  
  if (error) throw error;
  
  // Create final engagement data
  return clientIds.map(clientId => {
    const stats = clientStats.get(clientId) || { total: 0, read: 0 };
    const client = clientsData.find(c => c.id === clientId);
    const openRate = stats.total > 0 ? Math.round((stats.read / stats.total) * 100) : 0;
    
    return {
      client: client?.name || clientId,
      openRate
    };
  }).sort((a, b) => b.openRate - a.openRate);
};
