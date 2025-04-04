
import React, { ReactNode } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate, useLocation } from "react-router-dom";

interface PublitecaLayoutProps {
  children: ReactNode;
  title: string;
  description?: string;
}

export function PublitecaLayout({ children, title, description }: PublitecaLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;
  
  const mediaType = currentPath.split('/')[2] || 'prensa';
  
  const handleMediaChange = (value: string) => {
    navigate(`/publiteca/${value}`);
  };

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

      <Tabs 
        value={mediaType} 
        onValueChange={handleMediaChange} 
        className="w-full"
      >
        <TabsList className="grid grid-cols-4 w-full md:w-auto">
          <TabsTrigger value="prensa">Prensa</TabsTrigger>
          <TabsTrigger value="radio">Radio</TabsTrigger>
          <TabsTrigger value="tv">TV</TabsTrigger>
          <TabsTrigger value="redes-sociales">Redes Sociales</TabsTrigger>
        </TabsList>
      </Tabs>
      
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
