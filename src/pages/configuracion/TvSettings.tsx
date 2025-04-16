
import { useState, useEffect } from "react";  // Add useState to the import
import { SettingsLayout } from "@/components/settings/SettingsLayout";
import { TvSettingsTabs } from "@/components/settings/tv/TvSettingsTabs";
import { seedTvData, resetTvData } from "@/services/tv/seedService";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Database } from "lucide-react";
import { TvMigrationPanel } from "@/components/settings/tv/TvMigrationPanel";
import { Badge } from "@/components/ui/badge";
import { isUsingDatabase } from "@/services/tv/utils";
import { useTvTabState } from "@/hooks/tv/useTvTabState";

export default function TvSettings() {
  const { activeTab, setActiveTab } = useTvTabState({
    defaultTab: "channels",
    persistKey: "tv-settings-tabs"
  });
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [settingsTab, setSettingsTab] = useState<string>("data");
  const [storageType, setStorageType] = useState<"database" | "localStorage" | null>(null);

  useEffect(() => {
    // Initialize TV data when component loads
    const initializeTvData = async () => {
      try {
        setLoading(true);
        await seedTvData();
        const usingDb = await isUsingDatabase();
        setStorageType(usingDb ? "database" : "localStorage");
        toast.success("Datos de TV inicializados correctamente");
      } catch (error) {
        console.error("Error initializing TV data:", error);
        toast.error("Error al inicializar los datos de TV");
      } finally {
        setLoading(false);
      }
    };

    initializeTvData();
  }, []);

  const handleResetData = async () => {
    if (!confirm("¿Está seguro que desea restablecer todos los datos de TV a los valores predeterminados? Los programas personalizados se perderán.")) {
      return;
    }
    
    try {
      setResetting(true);
      await resetTvData();
      toast.success("Datos de TV restablecidos correctamente");
      // Force active tab to refresh
      setActiveTab(prev => {
        // Toggle and then toggle back to force re-render
        const current = prev;
        setTimeout(() => setActiveTab(current), 10);
        return prev === "channels" ? "programs" : "channels";
      });
      // Update storage type after reset
      const usingDb = await isUsingDatabase();
      setStorageType(usingDb ? "database" : "localStorage");
    } catch (error) {
      console.error("Error resetting TV data:", error);
      toast.error("Error al restablecer los datos de TV");
    } finally {
      setResetting(false);
    }
  };

  return (
    <SettingsLayout
      title="Televisión"
      description="Administra los canales y programas de televisión"
      action={
        <div className="flex gap-2 items-center">
          {storageType && (
            <Badge 
              variant={storageType === "database" ? "default" : "outline"}
              className="gap-1 mr-2"
            >
              <Database className="h-3.5 w-3.5" />
              {storageType === "database" ? "Base de datos" : "Local"}
            </Badge>
          )}
          <Button
            variant="secondary"
            onClick={() => setSettingsTab(settingsTab === "data" ? "migrations" : "data")}
          >
            {settingsTab === "data" ? "Ver migraciones" : "Ver datos"}
          </Button>
          <Button 
            variant="outline" 
            onClick={handleResetData}
            disabled={resetting}
          >
            {resetting ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <AlertTriangle className="h-4 w-4 mr-2" />
            )}
            Restablecer datos
          </Button>
        </div>
      }
    >
      {settingsTab === "data" ? (
        <TvSettingsTabs activeTab={activeTab} onTabChange={setActiveTab} loading={loading || resetting} />
      ) : (
        <TvMigrationPanel />
      )}
    </SettingsLayout>
  );
}
