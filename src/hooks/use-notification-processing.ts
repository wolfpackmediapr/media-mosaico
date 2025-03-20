
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getContentProcessingJobs, getNotificationDeliveryLogs } from "@/services/notifications/contentNotificationService";
import { supabase } from "@/integrations/supabase/client";

export function useNotificationProcessing() {
  const [activeFilter, setActiveFilter] = useState<"pending" | "processing" | "completed" | "failed" | undefined>(undefined);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const {
    data: jobsData,
    isLoading: isLoadingJobs,
    refetch: refetchJobs
  } = useQuery({
    queryKey: ["notification-processing-jobs", activeFilter, page, pageSize],
    queryFn: () => getContentProcessingJobs({
      status: activeFilter,
      limit: pageSize,
      page: page
    }),
  });

  const {
    data: deliveryLogsData,
    isLoading: isLoadingDeliveryLogs,
    refetch: refetchDeliveryLogs
  } = useQuery({
    queryKey: ["notification-delivery-logs", page, pageSize],
    queryFn: () => getNotificationDeliveryLogs({
      limit: pageSize,
      page: page
    }),
  });

  // Setup real-time updates
  useEffect(() => {
    const channel = supabase
      .channel("schema-db-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "content_processing_jobs"
        },
        () => {
          // Refresh jobs data
          refetchJobs();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notification_delivery_log"
        },
        () => {
          // Refresh delivery logs data
          refetchDeliveryLogs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetchJobs, refetchDeliveryLogs]);

  return {
    jobs: jobsData?.data || [],
    jobsCount: jobsData?.count || 0,
    isLoadingJobs,
    deliveryLogs: deliveryLogsData?.data || [],
    deliveryLogsCount: deliveryLogsData?.count || 0,
    isLoadingDeliveryLogs,
    activeFilter,
    setActiveFilter,
    page,
    setPage,
    pageSize,
    setPageSize,
    refetchJobs,
    refetchDeliveryLogs
  };
}
