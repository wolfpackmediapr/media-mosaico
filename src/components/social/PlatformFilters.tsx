
import { CheckIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { platformIcons } from "@/lib/platform-icons";

interface PlatformFiltersProps {
  platforms: { id: string; name: string; count: number }[];
  selectedPlatforms: string[];
  onPlatformChange: (platforms: string[]) => void;
}

const PlatformFilters = ({
  platforms,
  selectedPlatforms,
  onPlatformChange,
}: PlatformFiltersProps) => {
  const togglePlatform = (platformName: string) => {
    if (selectedPlatforms.includes(platformName)) {
      onPlatformChange(selectedPlatforms.filter(name => name !== platformName));
    } else {
      onPlatformChange([...selectedPlatforms, platformName]);
    }
  };

  const clearFilters = () => {
    onPlatformChange([]);
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-medium">Plataformas</CardTitle>
          {selectedPlatforms.length > 0 && (
            <button
              onClick={clearFilters}
              className="text-xs text-primary hover:underline"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="pt-4">
        <div className="space-y-4">
          {platforms.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay plataformas disponibles
            </p>
          ) : (
            <ul className="space-y-2">
              {platforms.map((platform) => {
                const isSelected = selectedPlatforms.includes(platform.name);
                const PlatformIcon = platformIcons[platform.id] || platformIcons.twitter;
                
                return (
                  <li key={platform.name}>
                    <button
                      onClick={() => togglePlatform(platform.name)}
                      className={cn(
                        "flex items-center w-full px-3 py-2 text-sm rounded-md transition-colors",
                        isSelected
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-muted"
                      )}
                    >
                      <div className="flex items-center flex-1">
                        <div className={cn(
                          "mr-2 h-4 w-4",
                          isSelected ? "text-primary" : "text-muted-foreground"
                        )}>
                          <PlatformIcon className="h-4 w-4" />
                        </div>
                        <span>{platform.name}</span>
                      </div>
                      <Badge variant="outline" className="ml-auto">
                        {platform.count}
                      </Badge>
                      {isSelected && (
                        <CheckIcon className="ml-2 h-4 w-4 text-primary" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PlatformFilters;
