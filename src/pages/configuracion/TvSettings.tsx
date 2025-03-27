
import { useState, useEffect } from "react";
import { SettingsLayout } from "@/components/settings/SettingsLayout";
import { TvSettingsTabs } from "@/components/settings/tv/TvSettingsTabs";
import { seedTvData } from "@/services/tv/seedService";

export default function TvSettings() {
  const [activeTab, setActiveTab] = useState<string>("channels");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize TV data when component loads
    const initializeTvData = async () => {
      try {
        await seedTvData();
      } catch (error) {
        console.error("Error initializing TV data:", error);
      } finally {
        setLoading(false);
      }
    };

    initializeTvData();
  }, []);

  return (
    <SettingsLayout
      title="Televisión"
      description="Administra los canales y programas de televisión"
    >
      <TvSettingsTabs activeTab={activeTab} onTabChange={setActiveTab} />
    </SettingsLayout>
  );
}
