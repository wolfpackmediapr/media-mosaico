
import React from "react";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Archive, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

interface DeliveryLogsTableProps {
  deliveryLogs: any[];
  deliveryLogsCount: number;
  isLoadingDeliveryLogs: boolean;
  page: number;
  setPage: (page: number) => void;
  pageSize: number;
}

const DeliveryLogsTable = ({
  deliveryLogs,
  deliveryLogsCount,
  isLoadingDeliveryLogs,
  page,
  setPage,
  pageSize,
}: DeliveryLogsTableProps) => {
  // Format date utility function
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-ES', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Status badge styling
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">Pendiente</Badge>;
      case 'processing':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">Procesando</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">Completado</Badge>;
      case 'failed':
        return <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">Fallido</Badge>;
      case 'sent':
        return <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">Enviado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Channel display
  const getChannelDisplay = (channel: string) => {
    switch (channel) {
      case 'email': return 'Correo electrónico';
      case 'sms': return 'SMS';
      case 'push': return 'Notificación push';
      case 'in_app': return 'En la aplicación';
      default: return channel;
    }
  };

  return (
    <>
      <div className="flex justify-end items-center mb-6">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            Página {page + 1} de {Math.max(1, Math.ceil(deliveryLogsCount / pageSize))}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPage(page + 1)}
            disabled={(page + 1) * pageSize >= deliveryLogsCount}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Notificación</TableHead>
              <TableHead>Canal</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Creado</TableHead>
              <TableHead>Enviado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoadingDeliveryLogs ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                  <span className="mt-2 text-sm text-muted-foreground block">Cargando registros de entrega...</span>
                </TableCell>
              </TableRow>
            ) : deliveryLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-6">
                  <Archive className="h-5 w-5 mx-auto text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">No se encontraron registros de entrega</span>
                </TableCell>
              </TableRow>
            ) : (
              deliveryLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="max-w-xs truncate" title={log.client_alerts?.title || ""}>
                    {log.client_alerts?.title || ""}
                  </TableCell>
                  <TableCell>{getChannelDisplay(log.channel)}</TableCell>
                  <TableCell>{getStatusBadge(log.status)}</TableCell>
                  <TableCell>{formatDate(log.created_at)}</TableCell>
                  <TableCell>{log.sent_at ? formatDate(log.sent_at) : '-'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
};

export default DeliveryLogsTable;
