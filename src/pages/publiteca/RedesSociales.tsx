
import React, { useState } from "react";
import { PublitecaLayout } from "@/components/publiteca/PublitecaLayout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RedesPublicaciones } from "@/components/publiteca/redes-sociales/RedesPublicaciones";
import { RedesAnuncios } from "@/components/publiteca/redes-sociales/RedesAnuncios";
import { RedesInfluencers } from "@/components/publiteca/redes-sociales/RedesInfluencers";
import { RedesMenciones } from "@/components/publiteca/redes-sociales/RedesMenciones";

export default function RedesSociales() {
  const [activeTab, setActiveTab] = useState("publicaciones");

  return (
    <PublitecaLayout 
      title="Redes Sociales" 
      description="Gestión de publicaciones, anuncios, influencers y menciones en redes sociales"
    >
      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab} 
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="publicaciones">Publicaciones</TabsTrigger>
          <TabsTrigger value="anuncios">Anuncios</TabsTrigger>
          <TabsTrigger value="influencers">Influencers</TabsTrigger>
          <TabsTrigger value="menciones">Comentarios y Menciones</TabsTrigger>
        </TabsList>
        
        <TabsContent value="publicaciones">
          <RedesPublicaciones />
        </TabsContent>
        
        <TabsContent value="anuncios">
          <RedesAnuncios />
        </TabsContent>
        
        <TabsContent value="influencers">
          <RedesInfluencers />
        </TabsContent>
        
        <TabsContent value="menciones">
          <RedesMenciones />
        </TabsContent>
      </Tabs>
    </PublitecaLayout>
  );
}
