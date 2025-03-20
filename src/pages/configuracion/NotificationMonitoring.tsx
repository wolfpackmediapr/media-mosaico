
import React, { useState } from "react";
import { useNotificationProcessing } from "@/hooks/use-notification-processing";
import { useNotificationPreferences } from "@/hooks/use-notification-preferences";
import {
  MonitoringHeader,
  MonitoringTabs
} from "@/components/monitoring";

const NotificationMonitoring = () => {
  const {
    jobs,
    jobsCount,
    isLoadingJobs,
    deliveryLogs,
    deliveryLogsCount,
    isLoadingDeliveryLogs,
    analytics,
    isLoadingAnalytics,
    activeFilter,
    setActiveFilter,
    page,
    setPage,
    pageSize,
    setPageSize
  } = useNotificationProcessing();

  const {
    preferences,
    isLoading: isLoadingPreferences,
    clients,
    createPreference,
    isPending
  } = useNotificationPreferences();

  const [activeTab, setActiveTab] = useState("analytics");

  return (
    <div className="space-y-6">
      <MonitoringHeader 
        title="Monitoreo de Notificaciones"
        description="Analice, monitoree y optimice el sistema de notificaciones"
      />

      <MonitoringTabs
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        jobs={jobs}
        jobsCount={jobsCount}
        isLoadingJobs={isLoadingJobs}
        deliveryLogs={deliveryLogs}
        deliveryLogsCount={deliveryLogsCount}
        isLoadingDeliveryLogs={isLoadingDeliveryLogs}
        analytics={analytics}
        isLoadingAnalytics={isLoadingAnalytics}
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
        page={page}
        setPage={setPage}
        pageSize={pageSize}
        clients={clients || []}
        createPreference={createPreference}
        isPending={isPending}
      />
    </div>
  );
};

export default NotificationMonitoring;
