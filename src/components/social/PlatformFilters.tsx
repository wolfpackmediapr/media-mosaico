
import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Circle } from "lucide-react";
import type { SocialPlatform } from "@/types/social";

interface PlatformFiltersProps {
  platforms: SocialPlatform[];
  selectedPlatforms: string[];
  onPlatformChange: (platforms: string[]) => void;
}

const PlatformFilters = ({ 
  platforms = [], 
  selectedPlatforms = [], 
  onPlatformChange 
}: PlatformFiltersProps) => {
  const handleTogglePlatform = (platformName: string) => {
    const isSelected = selectedPlatforms.includes(platformName);
    
    if (isSelected) {
      onPlatformChange(selectedPlatforms.filter(p => p !== platformName));
    } else {
      onPlatformChange([...selectedPlatforms, platformName]);
    }
  };

  // Handle case when platforms fails to load
  if (!platforms || platforms.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Fuentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            No hay fuentes disponibles
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Fuentes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col space-y-2">
          {platforms.map((platform) => (
            <button
              key={platform.name}
              onClick={() => handleTogglePlatform(platform.name)}
              className="flex items-center justify-between p-2 rounded-md hover:bg-accent text-left"
            >
              <div className="flex items-center space-x-2">
                {selectedPlatforms.includes(platform.name) ? (
                  <CheckCircle className="h-4 w-4 text-primary" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="text-sm">{platform.name}</span>
              </div>
              <Badge variant="secondary" className="text-xs">
                {platform.count}
              </Badge>
            </button>
          ))}
        </div>

        {selectedPlatforms.length > 0 && (
          <button
            onClick={() => onPlatformChange([])}
            className="text-xs text-primary hover:underline mt-3"
          >
            Limpiar filtros
          </button>
        )}
      </CardContent>
    </Card>
  );
};

export default PlatformFilters;
