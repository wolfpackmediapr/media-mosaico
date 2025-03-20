
import React from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { JobStatus } from "@/hooks/use-notification-processing";

interface ProcessingJobsTableProps {
  jobs: any[];
  jobsCount: number;
  isLoadingJobs: boolean;
  activeFilter: JobStatus;
  setActiveFilter: React.Dispatch<React.SetStateAction<JobStatus>>;
  page: number;
  setPage: (page: number) => void;
  pageSize: number;
}

const ProcessingJobsTable = ({
  jobs,
  jobsCount,
  isLoadingJobs,
  activeFilter,
  setActiveFilter,
  page,
  setPage,
  pageSize,
}: ProcessingJobsTableProps) => {
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
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Content type display
  const getContentTypeDisplay = (type: string) => {
    switch (type) {
      case 'news': return 'Noticias';
      case 'social': return 'Redes Sociales';
      case 'radio': return 'Radio';
      case 'tv': return 'TV';
      case 'press': return 'Prensa';
      default: return type;
    }
  };

  // Handle filter change with correct type casting
  const handleFilterChange = (value: string) => {
    if (value === "all") {
      setActiveFilter(undefined);
    } else {
      setActiveFilter(value as "pending" | "processing" | "completed" | "failed");
    }
  };

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Label htmlFor="status-filter">Filtrar por estado:</Label>
          <Select 
            value={activeFilter || "all"}
            onValueChange={handleFilterChange}
          >
            <SelectTrigger id="status-filter" className="w-[180px]">
              <SelectValue placeholder="Todos los estados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendientes</SelectItem>
              <SelectItem value="processing">Procesando</SelectItem>
              <SelectItem value="completed">Completados</SelectItem>
              <SelectItem value="failed">Fallidos</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
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
            Página {page + 1} de {Math.max(1, Math.ceil(jobsCount / pageSize))}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPage(page + 1)}
            disabled={(page + 1) * pageSize >= jobsCount}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Tipo de Contenido</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Creado</TableHead>
              <TableHead>Procesado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoadingJobs ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                  <span className="mt-2 text-sm text-muted-foreground block">Cargando trabajos...</span>
                </TableCell>
              </TableRow>
            ) : jobs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-6">
                  <AlertCircle className="h-5 w-5 mx-auto text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">No se encontraron trabajos de procesamiento</span>
                </TableCell>
              </TableRow>
            ) : (
              jobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell className="font-mono text-xs">{job.id.substring(0, 8)}...</TableCell>
                  <TableCell>{getContentTypeDisplay(job.content_type)}</TableCell>
                  <TableCell>{getStatusBadge(job.status)}</TableCell>
                  <TableCell>{formatDate(job.created_at)}</TableCell>
                  <TableCell>{job.processed_at ? formatDate(job.processed_at) : '-'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
};

export default ProcessingJobsTable;
