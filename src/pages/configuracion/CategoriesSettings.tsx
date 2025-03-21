
import { useState, useEffect } from "react";
import { SettingsLayout } from "@/components/settings/SettingsLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Edit, Trash2 } from "lucide-react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

// Define the Category type
interface Category {
  id: string;
  name_es: string;
  name_en: string;
  created_at?: string;
}

export default function CategoriesSettings() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name_es: "",
    name_en: "",
  });
  const { toast } = useToast();

  // Set initial categories based on the image provided
  useEffect(() => {
    const initialCategories: Category[] = [
      { id: "1", name_es: "ENTRETENIMIENTO", name_en: "SHOW BUSINESS & ENTRATAINMENT" },
      { id: "2", name_es: "EDUCACION & CULTURA", name_en: "" },
      { id: "3", name_es: "COMUNIDAD", name_en: "COMMUNITY" },
      { id: "4", name_es: "SALUD", name_en: "HEALTH & FITNESS" },
      { id: "5", name_es: "CRIMEN", name_en: "CRIME" },
      { id: "6", name_es: "TRIBUNALES", name_en: "COURT & JUSTICE" },
      { id: "7", name_es: "AMBIENTE & EL TIEMPO", name_en: "WEATHER & ENVIRONMENT" },
      { id: "8", name_es: "ECONOMIA & NEGOCIOS", name_en: "BUSINESS & ECONOMY" },
      { id: "9", name_es: "GOBIERNO", name_en: "GOVERNMENT & GOV. AGENCIES" },
      { id: "10", name_es: "POLITICA", name_en: "POLITICS" },
      { id: "11", name_es: "EE.UU. & INTERNACIONALES", name_en: "USA & INTERNATIONAL NEWS" },
      { id: "12", name_es: "DEPORTES", name_en: "SPORTS" },
      { id: "13", name_es: "RELIGION", name_en: "RELIGIOUS" },
      { id: "14", name_es: "OTRAS", name_en: "OTHER" },
      { id: "15", name_es: "ACCIDENTES", name_en: "ACCIDENTS" },
      { id: "16", name_es: "CIENCIA & TECNOLOGIA", name_en: "SCIENCE & TECHNOLOGY" },
      { id: "17", name_es: "AGENCIAS DE GOBIERNO", name_en: "" },
      { id: "18", name_es: "AMBIENTE", name_en: "ENVIRONMENT" },
    ];
    
    setCategories(initialCategories);
    setLoading(false);
    
    // In a real implementation, you would fetch from Supabase
    // fetchCategories();
  }, []);

  // This would be the real implementation to fetch from Supabase
  const fetchCategories = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name_es');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las categorías",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEdit = (category: Category) => {
    setCurrentCategory(category);
    setFormData({
      name_es: category.name_es,
      name_en: category.name_en || "",
    });
    setIsEditing(true);
    setShowDialog(true);
  };

  const handleAddNew = () => {
    setCurrentCategory(null);
    setFormData({ name_es: "", name_en: "" });
    setIsEditing(false);
    setShowDialog(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.name_es.trim()) {
      toast({
        title: "Error",
        description: "El nombre en español es obligatorio",
        variant: "destructive",
      });
      return;
    }

    // In a real implementation, you would save to Supabase
    // For now, we'll just update the local state
    try {
      if (isEditing && currentCategory) {
        // Update existing category
        const updatedCategories = categories.map(cat => 
          cat.id === currentCategory.id 
            ? { ...cat, name_es: formData.name_es, name_en: formData.name_en }
            : cat
        );
        setCategories(updatedCategories);
        
        toast({
          title: "Éxito",
          description: "Categoría actualizada correctamente",
        });
      } else {
        // Add new category
        const newCategory: Category = {
          id: Date.now().toString(), // Temporary ID for demo
          name_es: formData.name_es,
          name_en: formData.name_en,
        };
        
        setCategories([...categories, newCategory]);
        
        toast({
          title: "Éxito",
          description: "Categoría añadida correctamente",
        });
      }
      
      setShowDialog(false);
    } catch (error) {
      console.error('Error saving category:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar la categoría",
        variant: "destructive",
      });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("¿Estás seguro de que deseas eliminar esta categoría?")) {
      // In a real implementation, you would delete from Supabase
      const filteredCategories = categories.filter(cat => cat.id !== id);
      setCategories(filteredCategories);
      
      toast({
        title: "Éxito",
        description: "Categoría eliminada correctamente",
      });
    }
  };

  return (
    <SettingsLayout
      title="Categorías"
      description="Administra las categorías para la clasificación de contenido"
    >
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Categorías de Contenido</CardTitle>
          <CardDescription>
            Administra las categorías utilizadas para clasificar el contenido en la plataforma
          </CardDescription>
        </div>
        <Button onClick={handleAddNew}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Agregar Categoría
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-pulse text-center">
              <p className="text-muted-foreground">Cargando categorías...</p>
            </div>
          </div>
        ) : categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="mb-4 text-muted-foreground">No hay categorías definidas</p>
            <Button onClick={handleAddNew}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Agregar primera categoría
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">CATEGORIA</TableHead>
                <TableHead className="w-[40%]">CATEGORIA EN INGLES</TableHead>
                <TableHead className="w-[20%] text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium">{category.name_es}</TableCell>
                  <TableCell>{category.name_en || "-"}</TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleEdit(category)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleDelete(category.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <CardFooter className="border-t bg-muted/50 px-6 py-3">
        <p className="text-xs text-muted-foreground">
          Total: {categories.length} categorías
        </p>
      </CardFooter>

      {/* Add/Edit Category Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Editar Categoría" : "Agregar Nueva Categoría"}
            </DialogTitle>
            <DialogDescription>
              Complete los campos para {isEditing ? "actualizar la" : "agregar una nueva"} categoría.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name_es">Nombre en Español *</Label>
                <Input
                  id="name_es"
                  name="name_es"
                  value={formData.name_es}
                  onChange={handleInputChange}
                  placeholder="Nombre de la categoría en español"
                  required
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="name_en">Nombre en Inglés</Label>
                <Input
                  id="name_en"
                  name="name_en"
                  value={formData.name_en}
                  onChange={handleInputChange}
                  placeholder="Nombre de la categoría en inglés (opcional)"
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowDialog(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">
                {isEditing ? "Guardar cambios" : "Agregar categoría"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </SettingsLayout>
  );
}
