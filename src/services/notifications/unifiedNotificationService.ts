
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface NotificationData {
  client_id?: string;
  title: string;
  description?: string;
  content_id?: string;
  content_type?: "news" | "social" | "radio" | "tv" | "press";
  keyword_matched?: string[];
  importance_level?: number;
  metadata?: Record<string, any>;
}

const TOAST_DEBOUNCE_MS = 2000;
const pendingToasts = new Map<string, NodeJS.Timeout>();

/**
 * Create a notification with client validation
 */
export const createNotification = async (notificationData: NotificationData) => {
  try {
    // Skip validation if no client_id is provided (system notification)
    if (notificationData.client_id) {
      // First check if client exists to avoid foreign key constraint error
      const { data: clientExists, error: clientCheckError } = await supabase
        .from("clients")
        .select("id, name")
        .eq("id", notificationData.client_id)
        .maybeSingle();
      
      if (clientCheckError) {
        console.error("Error checking client:", clientCheckError);
        throw new Error(`Client validation failed: ${clientCheckError.message}`);
      }
      
      // If client doesn't exist, log warning and skip notification creation
      if (!clientExists) {
        console.warn(`Skipping notification creation: Client with ID ${notificationData.client_id} not found`);
        return { 
          success: false, 
          error: `Client with ID ${notificationData.client_id} not found`,
          skipped: true 
        };
      }
      
      // Add client name to metadata for easier display
      if (clientExists.name) {
        notificationData.metadata = {
          ...(notificationData.metadata || {}),
          clientName: clientExists.name
        };
      }
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

    if (error) {
      console.error("Error creating notification:", error);
      throw error;
    }
    
    return { success: true, data: data[0] };
  } catch (error) {
    console.error("Error creating notification:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

/**
 * Show a debounced toast notification to prevent flooding the UI
 */
export const showDebouncedToast = (
  title: string, 
  description: string, 
  type: "default" | "destructive" = "default",
  toastId?: string
) => {
  // Generate a unique ID based on content if not provided
  const id = toastId || `${title}-${description}`.substring(0, 20);
  
  // Clear any pending toast with the same ID
  if (pendingToasts.has(id)) {
    clearTimeout(pendingToasts.get(id));
    pendingToasts.delete(id);
  }
  
  // Set a new debounced toast
  const timeoutId = setTimeout(() => {
    toast({
      title,
      description,
      variant: type,
    });
    pendingToasts.delete(id);
  }, TOAST_DEBOUNCE_MS);
  
  pendingToasts.set(id, timeoutId);
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
 * Listen for real-time notification updates
 */
export const setupNotificationListener = (callback?: (notification: any) => void) => {
  const channel = supabase
    .channel("client-alerts-channel")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "client_alerts"
      },
      (payload) => {
        console.log("New notification received:", payload);
        
        const notificationData = payload.new;
        const title = notificationData.title || "Nueva notificación";
        const description = notificationData.description || "";
        const clientName = notificationData.metadata?.clientName || "";
        
        // Show toast with client name if available
        const toastTitle = clientName ? `${title} - ${clientName}` : title;
        
        showDebouncedToast(
          toastTitle,
          description,
          notificationData.importance_level >= 4 ? "destructive" : "default"
        );
        
        // Call optional callback
        if (callback) {
          callback(notificationData);
        }
      }
    )
    .subscribe();

  // Return unsub function
  return () => {
    supabase.removeChannel(channel);
  };
};
