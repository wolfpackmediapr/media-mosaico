
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface NotificationPreference {
  id: string;
  client_id: string;
  notification_channels: string[];
  frequency: string;
  threshold: number;
  sources: string[];
  is_active: boolean;
  clients?: {
    name: string;
  };
}

interface NotificationPreferenceTableProps {
  preferences: NotificationPreference[];
  onToggleActive: (id: string, isActive: boolean) => void;
  onDelete: (id: string) => void;
}

const NotificationPreferenceTable = ({
  preferences,
  onToggleActive,
  onDelete,
}: NotificationPreferenceTableProps) => {
  // Functions to get display values
  const getFrequencyDisplay = (frequency: string) => {
    const map: Record<string, string> = {
      "real_time": "Tiempo real",
      "hourly": "Cada hora",
      "daily": "Diario",
      "weekly": "Semanal",
    };
    return map[frequency] || frequency;
  };

  const getChannelsDisplay = (channels: string[]) => {
    const map: Record<string, string> = {
      "in_app": "App",
      "email": "Email",
      "sms": "SMS",
      "push": "Push",
    };
    return channels.map(c => map[c] || c).join(", ");
  };

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cliente</TableHead>
            <TableHead>Canales</TableHead>
            <TableHead>Frecuencia</TableHead>
            <TableHead>Umbral</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {preferences?.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                No hay preferencias de notificación configuradas
              </TableCell>
            </TableRow>
          ) : (
            preferences?.map((pref) => (
              <TableRow key={pref.id}>
                <TableCell className="font-medium">
                  {pref.clients?.name || "Cliente desconocido"}
                </TableCell>
                <TableCell>
                  {getChannelsDisplay(pref.notification_channels)}
                </TableCell>
                <TableCell>
                  {getFrequencyDisplay(pref.frequency)}
                </TableCell>
                <TableCell>{pref.threshold}</TableCell>
                <TableCell>
                  <Badge variant={pref.is_active ? "default" : "secondary"}>
                    {pref.is_active ? "Activo" : "Inactivo"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onToggleActive(pref.id, !pref.is_active)}
                    >
                      {pref.is_active ? "Desactivar" : "Activar"}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        if (confirm("¿Está seguro que desea eliminar esta preferencia?")) {
                          onDelete(pref.id);
                        }
                      }}
                    >
                      Eliminar
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default NotificationPreferenceTable;
