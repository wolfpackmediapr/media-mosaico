
import React from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { FileText, ExternalLink } from "lucide-react";

const PrensaPageHeader = () => {
  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Prensa Escrita</h1>
          <p className="text-muted-foreground">
            Analiza periódicos y revistas en formato PDF
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <a 
              href="https://chat.openai.com/share/88a2c6eca1ab5d21d8e4d9a12338a9f4" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <FileText className="h-4 w-4 mr-2" />
              Documentación
              <ExternalLink className="h-3 w-3 ml-2" />
            </a>
          </Button>
        </div>
      </div>
      
      <Separator />
    </>
  );
};

export default PrensaPageHeader;
