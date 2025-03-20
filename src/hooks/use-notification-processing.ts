
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getContentProcessingJobs, getNotificationDeliveryLogs, getNotificationAnalytics } from "@/services/notifications/contentNotificationService";
import { supabase } from "@/integrations/supabase/client";

export interface NotificationAnalytics {
  totalCount: number;
  volumeByDay: { date: string; count: number }[];
  topKeywords: { keyword: string; count: number }[];
  sourceDistribution: { source: string; count: number }[];
  clientEngagement: { client: string; openRate: number }[];
}

export type JobStatus = "pending" | "processing" | "completed" | "failed" | undefined;

export function useNotificationProcessing() {
  const [activeFilter, setActiveFilter] = useState<JobStatus>(undefined);
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

  const {
    data: analyticsData,
    isLoading: isLoadingAnalytics,
    refetch: refetchAnalytics
  } = useQuery({
    queryKey: ["notification-analytics"],
    queryFn: () => getNotificationAnalytics(),
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
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "client_alerts"
        },
        () => {
          // Refresh analytics data when notifications change
          refetchAnalytics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetchJobs, refetchDeliveryLogs, refetchAnalytics]);

  return {
    jobs: jobsData?.data || [],
    jobsCount: jobsData?.count || 0,
    isLoadingJobs,
    deliveryLogs: deliveryLogsData?.data || [],
    deliveryLogsCount: deliveryLogsData?.count || 0,
    isLoadingDeliveryLogs,
    analytics: analyticsData?.data || null,
    isLoadingAnalytics,
    activeFilter,
    setActiveFilter,
    page,
    setPage,
    pageSize,
    setPageSize,
    refetchJobs,
    refetchDeliveryLogs,
    refetchAnalytics
  };
}
