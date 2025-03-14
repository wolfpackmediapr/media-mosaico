
import { SettingsLayout } from "@/components/settings/SettingsLayout";
import { Card } from "@/components/ui/card";
import { ClientsContainer } from "@/components/settings/clients/ClientsContainer";

export default function ClientsSettings() {
  return (
    <SettingsLayout
      title="Clientes"
      description="Administra los clientes del sistema"
    >
      <Card className="overflow-hidden">
        <ClientsContainer />
      </Card>
    </SettingsLayout>
  );
}
