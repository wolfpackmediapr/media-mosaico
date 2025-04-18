
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  AlertCircle, 
  CheckCircle, 
  Database, 
  HardDrive, 
  RefreshCw, 
  ShieldAlert, 
  AlertTriangle,
  Info
} from "lucide-react";
import { migrateToDatabase, resetTvData } from "@/services/tv/seedService";
import { getDataVersion, isUsingDatabase, getStoredPrograms } from "@/services/tv/utils";
import { getAppliedMigrations, validateMigrationEligibility } from "@/services/tv/migration/migrationService";
import { TVMigration } from "@/services/tv/types";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function TvMigrationPanel() {
  const [loading, setLoading] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [dataStorage, setDataStorage] = useState<'localStorage' | 'database' | 'unknown'>('unknown');
  const [version, setVersion] = useState<string>('');
  const [migrations, setMigrations] = useState<TVMigration[]>([]);
  const [activeTab, setActiveTab] = useState<string>("status");
  const [validationResult, setValidationResult] = useState<{ 
    eligible: boolean; 
    programCount: number; 
    message: string; 
  } | null>(null);
  const [migrationProgress, setMigrationProgress] = useState(0);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const usingDb = await isUsingDatabase();
      setDataStorage(usingDb ? 'database' : 'localStorage');
      
      const ver = await getDataVersion();
      setVersion(ver);
      
      const migs = await getAppliedMigrations();
      setMigrations(migs);

      // Validate migration eligibility if using localStorage
      if (!usingDb) {
        const validation = await validateMigrationEligibility();
        setValidationResult(validation);
      } else {
        setValidationResult(null);
      }
    } catch (error) {
      console.error("Error loading migration status:", error);
    } finally {
      setLoading(false);
    }
  };

  const startMigrationProcess = () => {
    if (!validationResult?.eligible) {
      toast.error("No se puede migrar debido a problemas con los datos");
      return;
    }
    setShowConfirmDialog(true);
  };

  const handleMigrate = async () => {
    setShowConfirmDialog(false);
    setMigrating(true);
    setMigrationProgress(10); // Starting progress
    
    try {
      // Simulate progress stages
      const updateProgress = () => {
        setMigrationProgress(prev => {
          if (prev >= 90) return prev;
          return prev + 10;
        });
      };
      
      // Progress updates every 500ms to simulate migration phases
      const interval = setInterval(updateProgress, 500);
      
      // Do the actual migration
      const result = await migrateToDatabase();
      
      clearInterval(interval);
      setMigrationProgress(100);
      
      if (result) {
        toast.success("Datos migrados correctamente a la base de datos");
        await loadStatus();
      } else {
        toast.error("No hay datos para migrar o ya están en la base de datos");
      }
    } catch (error) {
      console.error("Error migrating data:", error);
      toast.error("Error al migrar los datos a la base de datos");
    } finally {
      setMigrating(false);
      setTimeout(() => setMigrationProgress(0), 1000); // Reset progress after a delay
    }
  };

  // Load migration status on initial render
  useEffect(() => {
    loadStatus();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Administración de Migraciones</CardTitle>
        <CardDescription>
          Gestione la migración de datos de TV entre localStorage y base de datos
        </CardDescription>
      </CardHeader>
      <CardContent>
        {migrating && (
          <div className="mb-6">
            <p className="text-sm font-medium mb-2">Migrando datos a la base de datos...</p>
            <Progress value={migrationProgress} className="h-2" />
          </div>
        )}
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="status">Estado</TabsTrigger>
            <TabsTrigger value="migrations">Migraciones Aplicadas</TabsTrigger>
          </TabsList>
          
          <TabsContent value="status">
            {loading ? (
              <div className="flex justify-center p-8">
                <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between border p-4 rounded-lg">
                  <div className="flex items-center gap-3">
                    {dataStorage === 'database' ? (
                      <Database className="h-5 w-5 text-green-500" />
                    ) : (
                      <HardDrive className="h-5 w-5 text-amber-500" />
                    )}
                    <div>
                      <p className="font-medium">Almacenamiento de datos</p>
                      <p className="text-sm text-muted-foreground">
                        {dataStorage === 'database' 
                          ? 'Base de datos (Supabase)' 
                          : dataStorage === 'localStorage' 
                            ? 'Almacenamiento local (localStorage)' 
                            : 'Desconocido'}
                      </p>
                    </div>
                  </div>
                  <Badge variant={dataStorage === 'database' ? "default" : "outline"}>
                    {dataStorage === 'database' ? 'Optimizado' : 'Legacy'}
                  </Badge>
                </div>
                
                <div className="border p-4 rounded-lg">
                  <p className="font-medium">Versión actual de datos</p>
                  <p className="text-sm text-muted-foreground">{version || 'Desconocida'}</p>
                </div>
                
                {validationResult && (
                  <div className="border p-4 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Info className="h-4 w-4 text-blue-500" />
                      <p className="font-medium">Datos disponibles para migración</p>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {validationResult.programCount} programas encontrados en localStorage
                    </p>
                  </div>
                )}
                
                {dataStorage === 'localStorage' && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Datos almacenados localmente</AlertTitle>
                    <AlertDescription>
                      Sus datos de TV están almacenados actualmente en el navegador (localStorage).
                      Para mejorar la persistencia y compatibilidad, se recomienda migrar a la base de datos.
                    </AlertDescription>
                  </Alert>
                )}
                
                {dataStorage === 'database' && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertTitle>Datos almacenados en base de datos</AlertTitle>
                    <AlertDescription>
                      Sus datos de TV están almacenados correctamente en la base de datos Supabase.
                    </AlertDescription>
                  </Alert>
                )}
                
                {validationResult && !validationResult.eligible && (
                  <Alert variant="destructive">
                    <ShieldAlert className="h-4 w-4" />
                    <AlertTitle>Migración no disponible</AlertTitle>
                    <AlertDescription>
                      {validationResult.message}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="migrations">
            {loading ? (
              <div className="flex justify-center p-8">
                <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : migrations.length > 0 ? (
              <div className="border rounded-lg divide-y">
                {migrations.map((migration) => (
                  <div key={migration.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{migration.name}</h4>
                      <Badge 
                        variant={
                          migration.status === 'completed' ? "default" : 
                          migration.status === 'failed' ? "destructive" : 
                          "outline"
                        }
                      >
                        {migration.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{migration.description}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs">Versión: {migration.version}</span>
                      <span className="text-xs">Aplicada: {new Date(migration.applied_at).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-8 border rounded-lg">
                <p className="text-muted-foreground">No hay migraciones aplicadas</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={loadStatus} disabled={loading}>
          Refrescar
        </Button>
        
        {dataStorage === 'localStorage' && (
          <Button 
            onClick={startMigrationProcess} 
            disabled={migrating || (validationResult && !validationResult.eligible)}
          >
            {migrating ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Migrando...
              </>
            ) : (
              <>Migrar a base de datos</>
            )}
          </Button>
        )}
      </CardFooter>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar migración de datos</DialogTitle>
            <DialogDescription>
              Está a punto de migrar {validationResult?.programCount || 0} programas de TV desde el 
              almacenamiento local (localStorage) a la base de datos Supabase.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Información importante</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>Esta operación no se puede deshacer</li>
                  <li>Los datos serán copiados a la base de datos</li>
                  <li>Los datos en localStorage se mantendrán como respaldo</li>
                  <li>Después de la migración, la aplicación usará la base de datos como fuente principal</li>
                </ul>
              </AlertDescription>
            </Alert>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleMigrate}>
              Continuar con la migración
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
