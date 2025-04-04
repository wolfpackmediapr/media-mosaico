
import React, { useState } from "react";
import { PublitecaLayout } from "@/components/publiteca/PublitecaLayout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TvNoticias } from "@/components/publiteca/tv/TvNoticias";
import { TvAnuncios } from "@/components/publiteca/tv/TvAnuncios";
import { TvPublicity } from "@/components/publiteca/tv/TvPublicity";

export default function Tv() {
  const [activeTab, setActiveTab] = useState("noticias");

  return (
    <PublitecaLayout 
      title="TV" 
      description="Gestión de noticias, anuncios y publicity en televisión"
    >
      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab} 
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="noticias">Noticias</TabsTrigger>
          <TabsTrigger value="anuncios">Anuncios</TabsTrigger>
          <TabsTrigger value="publicity">Publicity</TabsTrigger>
        </TabsList>
        
        <TabsContent value="noticias">
          <TvNoticias />
        </TabsContent>
        
        <TabsContent value="anuncios">
          <TvAnuncios />
        </TabsContent>
        
        <TabsContent value="publicity">
          <TvPublicity />
        </TabsContent>
      </Tabs>
    </PublitecaLayout>
  );
}
