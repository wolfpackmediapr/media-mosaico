
import { SettingsLayout } from "@/components/settings/SettingsLayout";
import { MediaSettingsContainer } from "@/components/settings/media/MediaSettingsContainer";

export default function MediaSettings() {
  return (
    <SettingsLayout
      title="Medios"
      description="Administra los medios de comunicación disponibles en el sistema"
    >
      <MediaSettingsContainer />
    </SettingsLayout>
  );
}
