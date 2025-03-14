
import { SettingsLayout } from "@/components/settings/SettingsLayout";
import { Card } from "@/components/ui/card";
import { UsersContainer } from "@/components/settings/users/UsersContainer";

export default function UsersSettings() {
  return (
    <SettingsLayout
      title="Usuarios"
      description="Administra los usuarios del sistema y sus permisos"
    >
      <Card className="overflow-hidden">
        <UsersContainer />
      </Card>
    </SettingsLayout>
  );
}
