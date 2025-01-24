import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Newspaper, Search, Filter, Download } from "lucide-react";

const Prensa = () => {
  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">BOT Prensa</h1>
        <p className="text-gray-500 mt-2">
          Monitoreo y análisis de contenido impreso y digital
        </p>
      </div>

      {/* Search and Filter Section */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar en prensa..."
            className="pl-10"
          />
        </div>
        <Button variant="outline" className="sm:w-auto">
          <Filter className="mr-2 h-4 w-4" />
          Filtros
        </Button>
        <Button variant="outline" className="sm:w-auto">
          <Download className="mr-2 h-4 w-4" />
          Exportar
        </Button>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Recent Articles */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Newspaper className="h-5 w-5" />
              Artículos Recientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <h3 className="font-medium text-gray-900">
                    Título del Artículo {item}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Fuente: El Nuevo Día
                  </p>
                  <p className="text-sm text-gray-500">
                    Fecha: {new Date().toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* News Sources */}
        <Card>
          <CardHeader>
            <CardTitle>Fuentes de Noticias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {["El Nuevo Día", "Primera Hora", "El Vocero"].map((source) => (
                <div
                  key={source}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <span className="font-medium text-gray-900">{source}</span>
                  <span className="text-sm text-gray-500">12 artículos</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Categories */}
        <Card>
          <CardHeader>
            <CardTitle>Categorías</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                "Política",
                "Economía",
                "Deportes",
                "Cultura",
                "Tecnología",
              ].map((category) => (
                <div
                  key={category}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <span className="font-medium text-gray-900">{category}</span>
                  <span className="text-sm text-gray-500">8 artículos</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Prensa;