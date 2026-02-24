import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface PDFUploadFormProps {
  publicationName: string;
  onPublicationNameChange: (name: string) => void;
  onSubmit: () => void;
  isUploading: boolean;
  isSubmitting: boolean;
  hasFile: boolean;
  publicationDate?: Date;
  onPublicationDateChange?: (date: Date | undefined) => void;
}

const PDFUploadForm = ({
  publicationName,
  onPublicationNameChange,
  onSubmit,
  isUploading,
  isSubmitting,
  hasFile,
  publicationDate,
  onPublicationDateChange
}: PDFUploadFormProps) => {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="publicationName" className="text-sm font-medium">
          Nombre de la Publicación
        </label>
        <Input
          id="publicationName"
          value={publicationName}
          onChange={(e) => onPublicationNameChange(e.target.value)}
          placeholder="Ej: El Nuevo Día, 25 de Agosto 2023"
          disabled={isUploading}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">
          Fecha de Publicación
        </label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              disabled={isUploading}
              className={cn(
                "w-full justify-start text-left font-normal",
                !publicationDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {publicationDate ? format(publicationDate, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={publicationDate}
              onSelect={onPublicationDateChange}
              disabled={(date) => date > new Date()}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      </div>
      
      <Button 
        className="w-full" 
        disabled={isUploading || isSubmitting || !hasFile || !publicationName.trim()}
        onClick={onSubmit}
        type="button"
        aria-label="Procesar PDF"
      >
        {isSubmitting ? (
          <span className="flex items-center">
            <Upload className="h-4 w-4 mr-2 animate-spin" />
            Enviando...
          </span>
        ) : isUploading ? (
          "Procesando..."
        ) : (
          "Procesar Archivo"
        )}
      </Button>
    </div>
  );
};

export default PDFUploadForm;
