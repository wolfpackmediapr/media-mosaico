
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { validateLocalStorageData, getMigrationStats, migrateToDatabase } from "@/services/radio/migration/radioDataMigrations";
import { getMigrations } from "@/services/radio/migration/migrationService";
import { getStorageStatus } from "@/services/radio/utils";
import { Database, AlertTriangle, ArrowRightLeft, CheckCircle2, XCircle } from "lucide-react";
import { RadioMigration, MigrationStatus } from "@/services/radio/types";
import { toast } from "sonner";

export function RadioMigrationPanel() {
  const [migrations, setMigrations] = useState<RadioMigration[]>([]);
  const [storageStatus, setStorageStatus] = useState<{
    usingDatabase: boolean;
    databaseProgramCount: number;
    localStorageProgramCount: number;
    version: string;
  }>({
    usingDatabase: false,
    databaseProgramCount: 0,
    localStorageProgramCount: 0,
    version: '0.0'
  });
  
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    issues: string[];
  }>({ valid: true, issues: [] });
  
  const [stats, setStats] = useState<{
    programsToMigrate: number;
    stationsNeeded: string[];
    estimatedTimeSeconds: number;
  }>({
    programsToMigrate: 0,
    stationsNeeded: [],
    estimatedTimeSeconds: 0
  });
  
  const [migrating, setMigrating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Get storage status
        const status = await getStorageStatus();
        setStorageStatus(status);
        
        // Fetch migrations
        const migrationsData = await getMigrations();
        setMigrations(migrationsData);
        
        // Only validate if there's data in localStorage
        if (status.localStorageProgramCount > 0) {
          const validation = await validateLocalStorageData();
          setValidationResult(validation);
          
          const migrationStats = await getMigrationStats();
          setStats(migrationStats);
        }
      } catch (error) {
        console.error('Error loading migration data:', error);
        toast.error('Error al cargar datos de migración');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);
  
  const handleMigration = async () => {
    try {
      setMigrating(true);
      setProgress(10);
      
      // Start migration
      const success = await migrateToDatabase();
      
      setProgress(100);
      
      if (success) {
        toast.success('Migración completada con éxito');
        
        // Refresh migrations and status
        const migrationsData = await getMigrations();
        setMigrations(migrationsData);
        
        const status = await getStorageStatus();
        setStorageStatus(status);
      } else {
        toast.info('No se encontraron datos para migrar');
      }
    } catch (error) {
      console.error('Error during migration:', error);
      toast.error('Error durante la migración');
    } finally {
      setMigrating(false);
    }
  };
  
  const renderMigrationStatus = (status: MigrationStatus) => {
    switch (status) {
      case MigrationStatus.COMPLETED:
        return <Badge className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" /> Completado</Badge>;
      case MigrationStatus.FAILED:
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Fallido</Badge>;
      case MigrationStatus.PENDING:
        return <Badge variant="outline">Pendiente</Badge>;
      case MigrationStatus.ROLLED_BACK:
        return <Badge variant="secondary">Revertido</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Migraciones de Datos de Radio</CardTitle>
          <CardDescription>Cargando información de migraciones...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center">
            <Progress value={20} className="w-[60%]" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Estado de Almacenamiento</CardTitle>
          <CardDescription>Información sobre dónde se almacenan los datos actualmente</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-4">
              <div className="flex items-center mb-2">
                <Database className="h-5 w-5 mr-2 text-primary" />
                <h3 className="font-medium">Base de datos</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-1">Programas: {storageStatus.databaseProgramCount}</p>
              <p className="text-sm text-muted-foreground">Versión: {storageStatus.version}</p>
            </div>
            
            <div className="border rounded-lg p-4">
              <div className="flex items-center mb-2">
                <ArrowRightLeft className="h-5 w-5 mr-2 text-primary" />
                <h3 className="font-medium">Local Storage</h3>
              </div>
              <p className="text-sm text-muted-foreground">Programas: {storageStatus.localStorageProgramCount}</p>
            </div>
          </div>
          
          <div className="mt-4 flex items-center">
            <span className="text-sm mr-2">Almacenamiento actual:</span>
            {storageStatus.usingDatabase ? (
              <Badge>Base de datos</Badge>
            ) : (
              <Badge variant="outline">Local Storage</Badge>
            )}
          </div>
        </CardContent>
      </Card>
      
      {storageStatus.localStorageProgramCount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Migrar a Base de Datos</CardTitle>
            <CardDescription>Migra los datos de localStorage a la base de datos</CardDescription>
          </CardHeader>
          <CardContent>
            {!validationResult.valid && (
              <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Problemas de validación</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-5 mt-2">
                    {validationResult.issues.map((issue, index) => (
                      <li key={index} className="text-sm">{issue}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Resumen de migración</h3>
                <ul className="list-disc pl-5 text-sm space-y-1">
                  <li>Programas a migrar: {stats.programsToMigrate}</li>
                  <li>Tiempo estimado: {stats.estimatedTimeSeconds} segundos</li>
                  <li>Estaciones requeridas: {stats.stationsNeeded.length > 0 ? stats.stationsNeeded.join(', ') : 'Ninguna'}</li>
                </ul>
              </div>
              
              {migrating && (
                <div className="my-4">
                  <p className="text-sm mb-2">Progreso de migración:</p>
                  <Progress value={progress} className="h-2" />
                </div>
              )}
              
              <Button 
                onClick={handleMigration} 
                disabled={migrating || !validationResult.valid || stats.programsToMigrate === 0}
              >
                <Database className="h-4 w-4 mr-2" />
                {migrating ? 'Migrando...' : 'Iniciar Migración'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {migrations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Historial de Migraciones</CardTitle>
            <CardDescription>Registro de migraciones previas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Versión</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Nombre</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Fecha</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Estado</th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-gray-200">
                  {migrations.map((migration) => (
                    <tr key={migration.id}>
                      <td className="py-2 px-4 whitespace-nowrap text-sm">{migration.version}</td>
                      <td className="py-2 px-4 whitespace-nowrap text-sm">{migration.name}</td>
                      <td className="py-2 px-4 whitespace-nowrap text-sm">
                        {new Date(migration.applied_at).toLocaleString()}
                      </td>
                      <td className="py-2 px-4 whitespace-nowrap text-sm">
                        {renderMigrationStatus(migration.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
