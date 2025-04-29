
import { useState, useEffect } from "react";
import { SettingsLayout } from "@/components/settings/SettingsLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast"; // Updated import path
import { Category } from "./types";
import { fetchCategories, addCategory, updateCategory, deleteCategory } from "./categoriesService";
import { CategoriesTable } from "./CategoriesTable";
import { EmptyState, LoadingState } from "./CategoryStates";
import { CategoryFormDialog } from "./CategoryFormDialog";

export default function CategoriesSettings() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<Category | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const data = await fetchCategories();
      setCategories(data);
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

  const handleEdit = (category: Category) => {
    setCurrentCategory(category);
    setIsEditing(true);
    setShowDialog(true);
  };

  const handleAddNew = () => {
    setCurrentCategory(null);
    setIsEditing(false);
    setShowDialog(true);
  };

  const handleSubmit = async (formData: { name_es: string; name_en: string }) => {
    // Basic validation
    if (!formData.name_es.trim()) {
      toast({
        title: "Error",
        description: "El nombre en español es obligatorio",
        variant: "destructive",
      });
      return;
    }

    try {
      if (isEditing && currentCategory) {
        // Update existing category
        const updatedCategory = await updateCategory(currentCategory.id, formData);
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
        const newCategory = await addCategory(formData);
        setCategories([...categories, { 
          id: newCategory.id,
          name_es: formData.name_es,
          name_en: formData.name_en
        }]);
        
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

  const handleDelete = async (id: string) => {
    if (confirm("¿Estás seguro de que deseas eliminar esta categoría?")) {
      try {
        await deleteCategory(id);
        const filteredCategories = categories.filter(cat => cat.id !== id);
        setCategories(filteredCategories);
        
        toast({
          title: "Éxito",
          description: "Categoría eliminada correctamente",
        });
      } catch (error) {
        console.error('Error deleting category:', error);
        toast({
          title: "Error",
          description: "No se pudo eliminar la categoría",
          variant: "destructive",
        });
      }
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
          <LoadingState />
        ) : categories.length === 0 ? (
          <EmptyState onAddNew={handleAddNew} />
        ) : (
          <CategoriesTable 
            categories={categories} 
            onEdit={handleEdit} 
            onDelete={handleDelete} 
          />
        )}
      </CardContent>
      <CardFooter className="border-t bg-muted/50 px-6 py-3">
        <p className="text-xs text-muted-foreground">
          Total: {categories.length} categorías
        </p>
      </CardFooter>

      <CategoryFormDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        onSubmit={handleSubmit}
        isEditing={isEditing}
        currentCategory={currentCategory}
      />
    </SettingsLayout>
  );
}
