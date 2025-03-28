
import { useState, useEffect } from "react";
import { SettingsLayout } from "@/components/settings/SettingsLayout";
import { RadioSettingsTabs } from "@/components/settings/radio/RadioSettingsTabs";
import { seedRadioData, resetRadioData } from "@/services/radio/seedService";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Database } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RadioMigrationPanel } from "@/components/settings/radio/RadioMigrationPanel";
import { isUsingDatabase } from "@/services/radio/utils";

export default function RadioSettings() {
  const [activeTab, setActiveTab] = useState<string>("stations");
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [settingsTab, setSettingsTab] = useState<string>("data");
  const [storageType, setStorageType] = useState<"database" | "localStorage" | null>(null);

  useEffect(() => {
    // Initialize radio data when component loads
    const initializeRadioData = async () => {
      try {
        setLoading(true);
        await seedRadioData();
        const usingDb = await isUsingDatabase();
        setStorageType(usingDb ? "database" : "localStorage");
        toast.success("Datos de radio inicializados correctamente");
      } catch (error) {
        console.error("Error initializing radio data:", error);
        toast.error("Error al inicializar los datos de radio");
      } finally {
        setLoading(false);
      }
    };

    initializeRadioData();
  }, []);

  const handleResetData = async () => {
    if (!confirm("¿Está seguro que desea restablecer todos los datos de radio a los valores predeterminados? Los programas personalizados se perderán.")) {
      return;
    }
    
    try {
      setResetting(true);
      await resetRadioData();
      toast.success("Datos de radio restablecidos correctamente");
      // Force active tab to refresh
      setActiveTab(prev => {
        // Toggle and then toggle back to force re-render
        const current = prev;
        setTimeout(() => setActiveTab(current), 10);
        return prev === "stations" ? "programs" : "stations";
      });
      // Update storage type after reset
      const usingDb = await isUsingDatabase();
      setStorageType(usingDb ? "database" : "localStorage");
    } catch (error) {
      console.error("Error resetting radio data:", error);
      toast.error("Error al restablecer los datos de radio");
    } finally {
      setResetting(false);
    }
  };

  return (
    <SettingsLayout
      title="Radio"
      description="Administra las estaciones, programas y tarifas de radio"
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
        <RadioSettingsTabs activeTab={activeTab} onTabChange={setActiveTab} loading={loading || resetting} />
      ) : (
        <RadioMigrationPanel />
      )}
    </SettingsLayout>
  );
}
