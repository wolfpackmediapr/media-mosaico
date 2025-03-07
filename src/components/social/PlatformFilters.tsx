
import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { platformIcons } from "@/lib/platform-icons";
import type { SocialPlatform } from "@/types/social";

interface PlatformFiltersProps {
  platforms: SocialPlatform[];
  selectedPlatforms: string[];
  onSelectPlatforms: (platforms: string[]) => void;
  isLoading?: boolean;
}

const PlatformFilters = ({ 
  platforms, 
  selectedPlatforms, 
  onSelectPlatforms, 
  isLoading = false 
}: PlatformFiltersProps) => {
  const [selected, setSelected] = useState<string[]>(selectedPlatforms);

  useEffect(() => {
    setSelected(selectedPlatforms);
  }, [selectedPlatforms]);

  const handleTogglePlatform = (platformId: string) => {
    setSelected(prev => {
      const newSelected = prev.includes(platformId)
        ? prev.filter(id => id !== platformId)
        : [...prev, platformId];
      
      onSelectPlatforms(newSelected);
      return newSelected;
    });
  };

  const handleSelectAll = () => {
    const allPlatformIds = platforms.map(platform => platform.id);
    setSelected(allPlatformIds);
    onSelectPlatforms(allPlatformIds);
  };

  const handleClearAll = () => {
    setSelected([]);
    onSelectPlatforms([]);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle><Skeleton className="h-6 w-32" /></CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-2">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Plataformas</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between mb-4">
          <Button variant="outline" size="sm" onClick={handleSelectAll}>
            Seleccionar todos
          </Button>
          <Button variant="outline" size="sm" onClick={handleClearAll}>
            Limpiar
          </Button>
        </div>
        
        <div className="space-y-3">
          {platforms.map((platform) => {
            const PlatformIcon = platformIcons[platform.id];
            
            return (
              <div key={platform.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`platform-${platform.id}`}
                  checked={selected.includes(platform.id)}
                  onCheckedChange={() => handleTogglePlatform(platform.id)}
                />
                <label
                  htmlFor={`platform-${platform.id}`}
                  className="flex items-center text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {PlatformIcon && (
                    <span className="mr-2">
                      <PlatformIcon className="h-4 w-4" />
                    </span>
                  )}
                  {platform.name}
                  <span className="ml-1 text-muted-foreground text-xs">
                    ({platform.count || 0})
                  </span>
                </label>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default PlatformFilters;
