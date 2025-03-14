
import { useState, useEffect } from "react";
import { SettingsLayout } from "@/components/settings/SettingsLayout";
import { Button } from "@/components/ui/button";
import { CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";

// Define types for media outlets
interface MediaOutlet {
  id: string;
  type: string;
  name: string;
  folder: string | null;
  created_at: string;
}

export default function GeneralSettings() {
  const [mediaOutlets, setMediaOutlets] = useState<MediaOutlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<keyof MediaOutlet>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Function to get display name for media type
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'tv': return 'Televisión';
      case 'radio': return 'Radio';
      case 'prensa': return 'Prensa Digital';
      case 'prensa_escrita': return 'Prensa Escrita';
      case 'redes_sociales': return 'Redes Sociales';
      default: return type;
    }
  };

  // Fetch media outlets from Supabase
  const fetchMediaOutlets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('media_outlets')
        .select('*')
        .order(sortField, { ascending: sortOrder === 'asc' });

      if (error) throw error;
      setMediaOutlets(data || []);
    } catch (error) {
      console.error('Error fetching media outlets:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle column sort
  const handleSort = (field: keyof MediaOutlet) => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    setSortField(field);
  };

  // Load data on component mount
  useEffect(() => {
    fetchMediaOutlets();
  }, [sortField, sortOrder]);

  return (
    <SettingsLayout
      title="Configuración General"
      description="Administra la configuración general del sistema"
    >
      <CardHeader>
        <CardTitle>Configuración General</CardTitle>
        <CardDescription>
          Estas configuraciones afectan a todos los aspectos del sistema
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <h3 className="text-lg font-medium">Medios de Comunicación</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Lista de medios de comunicación disponibles en el sistema
          </p>
          <div className="flex justify-end mb-4">
            <Button asChild variant="default" size="sm">
              <Link to="/ajustes/general/medios">Gestionar Medios</Link>
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-6">Cargando medios...</div>
          ) : mediaOutlets.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              No hay medios de comunicación configurados.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer"
                    onClick={() => handleSort('type')}
                  >
                    Tipo {sortField === 'type' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer"
                    onClick={() => handleSort('name')}
                  >
                    Nombre {sortField === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer"
                    onClick={() => handleSort('folder')}
                  >
                    Carpeta {sortField === 'folder' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mediaOutlets.map((outlet) => (
                  <TableRow key={outlet.id}>
                    <TableCell>{getTypeLabel(outlet.type)}</TableCell>
                    <TableCell>{outlet.name}</TableCell>
                    <TableCell>{outlet.folder || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <div className="space-y-2 mt-8">
          <h3 className="text-lg font-medium">Categorías</h3>
          <p className="text-sm text-muted-foreground">
            Administra las categorías para clasificar el contenido
          </p>
          <Button asChild variant="outline" size="sm">
            <Link to="/ajustes/general/categorias">Configurar categorías</Link>
          </Button>
        </div>
      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground">
          Los cambios en la configuración general afectan a todo el sistema
        </p>
      </CardFooter>
    </SettingsLayout>
  );
}
