import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const Tv = () => {
  const [selectedChannel, setSelectedChannel] = useState<string>("");
  const [selectedProgram, setSelectedProgram] = useState<string>("");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">MONITOREO TV</h1>
        <p className="text-gray-500 mt-2">
          Monitoreo y análisis de contenido televisivo en tiempo real
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Configuración de Monitoreo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="channel">Canal</Label>
              <Select value={selectedChannel} onValueChange={setSelectedChannel}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar canal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="canal13">Canal 13</SelectItem>
                  <SelectItem value="tvn">TVN</SelectItem>
                  <SelectItem value="mega">Mega</SelectItem>
                  <SelectItem value="chilevision">Chilevisión</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="program">Programa</Label>
              <Select value={selectedProgram} onValueChange={setSelectedProgram}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar programa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="noticias">Noticiero</SelectItem>
                  <SelectItem value="matinal">Matinal</SelectItem>
                  <SelectItem value="reportajes">Reportajes</SelectItem>
                  <SelectItem value="debate">Debate</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="keywords">Palabras Clave</Label>
              <Input
                id="keywords"
                placeholder="Ingrese palabras clave separadas por comas"
              />
            </div>

            <Button className="w-full">Iniciar Monitoreo</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vista Previa</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center bg-gray-100 rounded-lg">
            <p className="text-gray-500">Seleccione un canal para comenzar</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Segmentos Capturados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            No hay segmentos capturados aún
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Tv;