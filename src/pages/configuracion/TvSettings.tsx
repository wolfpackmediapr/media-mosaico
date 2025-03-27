
import { useState } from "react";
import { SettingsLayout } from "@/components/settings/SettingsLayout";
import { TvSettingsTabs } from "@/components/settings/tv/TvSettingsTabs";

export default function TvSettings() {
  const [activeTab, setActiveTab] = useState<string>("channels");

  return (
    <SettingsLayout
      title="Televisión"
      description="Administra los canales y programas de televisión"
    >
      <TvSettingsTabs activeTab={activeTab} onTabChange={setActiveTab} />
    </SettingsLayout>
  );
}
