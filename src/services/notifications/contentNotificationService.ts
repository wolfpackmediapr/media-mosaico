
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
