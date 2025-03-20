
import { supabase } from "@/integrations/supabase/client";

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
