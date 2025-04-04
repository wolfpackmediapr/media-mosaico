
import React, { useState } from "react";
import { PublitecaLayout } from "@/components/publiteca/PublitecaLayout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RadioNoticias } from "@/components/publiteca/radio/RadioNoticias";
import { RadioAnuncios } from "@/components/publiteca/radio/RadioAnuncios";
import { RadioPublicity } from "@/components/publiteca/radio/RadioPublicity";

export default function Radio() {
  const [activeTab, setActiveTab] = useState("noticias");

  return (
    <PublitecaLayout 
      title="Radio" 
      description="Gestión de noticias, anuncios y publicity en radio"
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
          <RadioNoticias />
        </TabsContent>
        
        <TabsContent value="anuncios">
          <RadioAnuncios />
        </TabsContent>
        
        <TabsContent value="publicity">
          <RadioPublicity />
        </TabsContent>
      </Tabs>
    </PublitecaLayout>
  );
}
