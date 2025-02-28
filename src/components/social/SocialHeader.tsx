
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SocialHeaderProps {
  onRefresh: () => void;
  isRefreshing: boolean;
}

const SocialHeader = ({ onRefresh, isRefreshing }: SocialHeaderProps) => {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
      <div>
        <h1 className="text-2xl font-bold">Redes Sociales</h1>
        <p className="text-muted-foreground">
          Monitoreo de contenido en plataformas sociales y feeds RSS
        </p>
      </div>
      <Button
        onClick={onRefresh}
        disabled={isRefreshing}
        className="whitespace-nowrap"
      >
        <RefreshCw
          className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
        />
        {isRefreshing ? "Actualizando..." : "Actualizar Feeds"}
      </Button>
    </div>
  );
};

export default SocialHeader;
