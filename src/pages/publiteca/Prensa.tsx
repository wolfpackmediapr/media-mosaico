
import React, { useState } from "react";
import { PublitecaLayout } from "@/components/publiteca/PublitecaLayout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PrensaNoticias } from "@/components/publiteca/prensa/PrensaNoticias";
import { PrensaAnuncios } from "@/components/publiteca/prensa/PrensaAnuncios";
import { PrensaPublicity } from "@/components/publiteca/prensa/PrensaPublicity";

export default function Prensa() {
  const [activeTab, setActiveTab] = useState("noticias");

  return (
    <PublitecaLayout 
      title="Prensa" 
      description="Gestión de noticias, anuncios y publicity en medios impresos"
    >
      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab} 
        className="w-full"
      >
        <TabsList className="flex w-full justify-start sm:grid sm:grid-cols-3">
          <TabsTrigger value="noticias">Noticias</TabsTrigger>
          <TabsTrigger value="anuncios">Anuncios</TabsTrigger>
          <TabsTrigger value="publicity">Publicity</TabsTrigger>
        </TabsList>
        
        <TabsContent value="noticias">
          <PrensaNoticias />
        </TabsContent>
        
        <TabsContent value="anuncios">
          <PrensaAnuncios />
        </TabsContent>
        
        <TabsContent value="publicity">
          <PrensaPublicity />
        </TabsContent>
      </Tabs>
    </PublitecaLayout>
  );
}
