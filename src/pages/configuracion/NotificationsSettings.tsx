
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNotificationPreferences } from "@/hooks/use-notification-preferences";
import { 
  NotificationSettingsHeader,
  NotificationPreferenceTable,
  CreateNotificationPreferenceDialog
} from "@/components/settings/notifications";

const NotificationsSettings = () => {
  const {
    preferences,
    isLoading,
    clients,
    createPreference,
    toggleActive,
    deletePreference,
    isPending
  } = useNotificationPreferences();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <NotificationSettingsHeader 
          title="Preferencias de Notificaciones" 
          description="Configuración de las notificaciones y alertas" 
        />
        <CreateNotificationPreferenceDialog
          onSubmit={values => createPreference.mutate(values)}
          clients={clients}
          isPending={isPending}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Preferencias de Notificación</CardTitle>
          <CardDescription>
            Gestione cómo se envían las notificaciones a los clientes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex space-x-4 items-center">
                  <div className="h-12 w-12 rounded-full bg-muted animate-pulse"></div>
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-muted rounded animate-pulse w-1/4"></div>
                    <div className="h-3 bg-muted rounded animate-pulse w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <NotificationPreferenceTable 
              preferences={preferences}
              onToggleActive={toggleActive}
              onDelete={deletePreference}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationsSettings;
