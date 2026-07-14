
import React, { ReactNode } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate, useLocation } from "react-router-dom";
import { useSectionPermissions } from "@/hooks/use-section-permissions";

interface PublitecaLayoutProps {
  children: ReactNode;
  title: string;
  description?: string;
}

export function PublitecaLayout({ children, title, description }: PublitecaLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;
  const { canAccess, canAccessAny } = useSectionPermissions();
  
  const mediaType = currentPath.split('/')[2] || 'prensa';
  
  const handleMediaChange = (value: string) => {
    navigate(`/publiteca/${value}`);
  };

  const tabs = [
    { value: "prensa", label: "Prensa", show: canAccessAny(["prensa", "prensa-escrita"]) },
    { value: "radio", label: "Radio", show: canAccess("radio") },
    { value: "tv", label: "TV", show: canAccess("tv") },
    { value: "redes-sociales", label: "Redes Sociales", show: canAccess("redes-sociales") },
  ].filter((t) => t.show);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Publiteca
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          Ingreso y gestión centralizada de datos de medios
        </p>
      </div>

      {tabs.length > 0 && (
        <Tabs
          value={mediaType}
          onValueChange={handleMediaChange}
          className="w-full"
        >
          <TabsList
            className="grid w-full md:w-auto"
            style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
          >
            {tabs.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}
      
      <Card className="overflow-hidden">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold">{title}</h2>
              {description && (
                <p className="text-sm text-gray-500 mt-1">{description}</p>
              )}
            </div>
            {children}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
