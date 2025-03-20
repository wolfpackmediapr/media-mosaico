
import { supabase } from "@/integrations/supabase/client";
import { NotificationAnalytics } from "@/hooks/use-notification-processing";

export interface ContentProcessingJob {
  id: string;
  content_id: string;
  content_type: "news" | "social" | "radio" | "tv" | "press";
  status: "pending" | "processing" | "completed" | "failed";
  error?: string;
  processed_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Schedules a job to process content for notifications
 */
export const scheduleContentProcessing = async () => {
  try {
    const { data, error } = await supabase.functions.invoke("schedule_content_processing");

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error scheduling content processing:", error);
    throw error;
  }
};

/**
 * Process a specific content item for notifications
 */
export const processContentItem = async (contentId: string, contentType: "news" | "social" | "radio" | "tv" | "press") => {
  try {
    // Create a job record
    const { data: job, error } = await supabase
      .from("content_processing_jobs")
      .insert({
        content_id: contentId,
        content_type: contentType
      })
      .select()
      .single();

    if (error) throw error;

    // Process the job
    const { data, error: processError } = await supabase.functions.invoke("process_content_notifications", {
      body: { job_id: job.id }
    });

    if (processError) throw processError;
    return data;
  } catch (error) {
    console.error("Error processing content item:", error);
    throw error;
  }
};

/**
 * Get processing jobs with optional filters
 */
export const getContentProcessingJobs = async (
  options: {
    status?: "pending" | "processing" | "completed" | "failed";
    contentType?: string;
    limit?: number;
    page?: number;
  } = {}
) => {
  try {
    const { status, contentType, limit = 20, page = 0 } = options;
    
    let query = supabase
      .from("content_processing_jobs")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (status) {
      query = query.eq("status", status);
    }
    
    if (contentType) {
      query = query.eq("content_type", contentType);
    }
    
    query = query.range(page * limit, (page + 1) * limit - 1);
    
    const { data, error, count } = await query;
    
    if (error) throw error;
    return { data, count };
  } catch (error) {
    console.error("Error getting content processing jobs:", error);
    throw error;
  }
};

/**
 * Process notification deliveries for external channels
 */
export const processNotificationDeliveries = async () => {
  try {
    const { data, error } = await supabase.functions.invoke("process_notification_delivery");

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error processing notification deliveries:", error);
    throw error;
  }
};

/**
 * Get notification delivery logs
 */
export const getNotificationDeliveryLogs = async (
  options: {
    notificationId?: string;
    status?: "pending" | "sent" | "failed";
    channel?: string;
    limit?: number;
    page?: number;
  } = {}
) => {
  try {
    const { notificationId, status, channel, limit = 20, page = 0 } = options;
    
    let query = supabase
      .from("notification_delivery_log")
      .select("*, client_alerts(*)")
      .order("created_at", { ascending: false });
    
    if (notificationId) {
      query = query.eq("notification_id", notificationId);
    }
    
    if (status) {
      query = query.eq("status", status);
    }
    
    if (channel) {
      query = query.eq("channel", channel);
    }
    
    query = query.range(page * limit, (page + 1) * limit - 1);
    
    const { data, error, count } = await query;
    
    if (error) throw error;
    return { data, count };
  } catch (error) {
    console.error("Error getting notification delivery logs:", error);
    throw error;
  }
};

/**
 * Get analytics data for notifications
 */
export const getNotificationAnalytics = async (): Promise<{ data: NotificationAnalytics }> => {
  try {
    // Get total count of notifications
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

    // Process to get daily counts
    const volumeByDay = volumeData
      ? processVolumeByDay(volumeData)
      : [];

    // Get top keywords
    const { data: keywordData, error: keywordError } = await supabase
      .from("client_alerts")
      .select("keyword_matched");

    if (keywordError) throw keywordError;

    const topKeywords = keywordData
      ? processTopKeywords(keywordData)
      : [];

    // Get source distribution
    const { data: sourceData, error: sourceError } = await supabase
      .from("client_alerts")
      .select("content_type");

    if (sourceError) throw sourceError;

    const sourceDistribution = sourceData
      ? processSourceDistribution(sourceData)
      : [];

    // Get client engagement (read vs unread)
    const { data: clientData, error: clientError } = await supabase
      .from("client_alerts")
      .select("client_id, status");

    if (clientError) throw clientError;

    const clientEngagement = clientData
      ? await processClientEngagement(clientData)
      : [];

    return {
      data: {
        totalCount: totalCount || 0,
        volumeByDay,
        topKeywords,
        sourceDistribution,
        clientEngagement
      }
    };
  } catch (error) {
    console.error("Error getting notification analytics:", error);
    throw error;
  }
};

// Helper function to process volume by day
const processVolumeByDay = (data: any[]) => {
  const countByDay: Record<string, number> = {};
  
  data.forEach(item => {
    const date = new Date(item.created_at).toISOString().split('T')[0];
    countByDay[date] = (countByDay[date] || 0) + 1;
  });
  
  return Object.entries(countByDay).map(([date, count]) => ({ date, count }));
};

// Helper function to process top keywords
const processTopKeywords = (data: any[]) => {
  const keywordCount: Record<string, number> = {};
  
  data.forEach(item => {
    if (item.keyword_matched && Array.isArray(item.keyword_matched)) {
      item.keyword_matched.forEach((keyword: string) => {
        keywordCount[keyword] = (keywordCount[keyword] || 0) + 1;
      });
    }
  });
  
  return Object.entries(keywordCount)
    .map(([keyword, count]) => ({ keyword, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10); // Top 10 keywords
};

// Helper function to process source distribution
const processSourceDistribution = (data: any[]) => {
  const sourceCount: Record<string, number> = {};
  
  data.forEach(item => {
    if (item.content_type) {
      const source = item.content_type;
      sourceCount[source] = (sourceCount[source] || 0) + 1;
    }
  });
  
  return Object.entries(sourceCount).map(([source, count]) => ({ source, count }));
};

// Helper function to process client engagement
const processClientEngagement = async (data: any[]) => {
  const clientStats: Record<string, { total: number; read: number }> = {};
  
  // Count totals and read notifications by client
  data.forEach(item => {
    if (item.client_id) {
      if (!clientStats[item.client_id]) {
        clientStats[item.client_id] = { total: 0, read: 0 };
      }
      
      clientStats[item.client_id].total += 1;
      
      if (item.status === 'read' || item.status === 'archived') {
        clientStats[item.client_id].read += 1;
      }
    }
  });
  
  // Get client names
  const clientIds = Object.keys(clientStats);
  if (clientIds.length === 0) return [];
  
  const { data: clients, error } = await supabase
    .from("clients")
    .select("id, name")
    .in("id", clientIds);
  
  if (error) {
    console.error("Error fetching client names:", error);
    return [];
  }
  
  // Map client names to stats
  const clientMap = clients?.reduce((acc: Record<string, string>, client) => {
    acc[client.id] = client.name;
    return acc;
  }, {}) || {};
  
  return Object.entries(clientStats).map(([clientId, stats]) => ({
    client: clientMap[clientId] || clientId,
    openRate: stats.total > 0 ? (stats.read / stats.total) * 100 : 0
  }));
};

/**
 * Get notification relevance score suggestions
 */
export const getRelevanceSuggestions = async (clientId: string) => {
  try {
    const { data, error } = await supabase.functions.invoke("analyze_notification_relevance", {
      body: { client_id: clientId }
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error getting relevance suggestions:", error);
    throw error;
  }
};

/**
 * Test notification settings with sample data
 */
export const testNotificationSettings = async (
  settings: {
    client_id: string;
    threshold: number;
    sources: string[];
    notification_channels: string[];
  }
) => {
  try {
    const { data, error } = await supabase.functions.invoke("test_notification_settings", {
      body: settings
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error testing notification settings:", error);
    throw error;
  }
};
