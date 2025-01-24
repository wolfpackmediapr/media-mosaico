import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Prensa = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">BOT Prensa</h1>
        <p className="text-gray-500 mt-2">
          Monitoreo y análisis de contenido impreso y digital
        </p>
      </div>

      <Tabs defaultValue="digital" className="w-full">
        <TabsList>
          <TabsTrigger value="digital">Prensa Digital</TabsTrigger>
          <TabsTrigger value="impresa">Prensa Impresa</TabsTrigger>
        </TabsList>

        <TabsContent value="digital" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Monitoreo Digital</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Medio</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar medio" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="emol">EMOL</SelectItem>
                      <SelectItem value="latercera">La Tercera</SelectItem>
                      <SelectItem value="biobio">BioBio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Sección</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar sección" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nacional">Nacional</SelectItem>
                      <SelectItem value="politica">Política</SelectItem>
                      <SelectItem value="economia">Economía</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Palabras Clave</Label>
                <Input placeholder="Ingrese palabras clave separadas por comas" />
              </div>

              <Button className="w-full">Iniciar Monitoreo</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Artículos Encontrados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                No hay artículos monitoreados aún
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="impresa" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Subir Edición Impresa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <p className="text-gray-500">
                  Arrastre archivos PDF o haga clic para seleccionar
                </p>
                <Button variant="outline" className="mt-4">
                  Seleccionar Archivo
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Prensa;