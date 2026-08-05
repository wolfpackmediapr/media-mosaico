
import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { TagsInput, type TagsInputHandle } from "@/components/ui/tags-input";
import { Client } from "@/services/clients/clientService";
import { fetchClientCategories } from "@/services/clients/clientCategoriesService";

export interface ClientFormProps {
  client?: Client | null;
  onSubmit: (formData: Client) => void;
  onCancel: () => void;
  initialData?: {
    name: string;
    category: string;
    subcategory?: string | null;
    keywords?: string[] | null;
  };
  isEditing?: boolean;
}

export function ClientForm({ client, onSubmit, onCancel, initialData, isEditing = false }: ClientFormProps) {
  const [formData, setFormData] = useState({
    name: client?.name || initialData?.name || '',
    keywords: (client?.keywords ?? initialData?.keywords ?? []) as string[],
  });
  const [categoryId, setCategoryId] = useState<string>(client?.client_category_id || '');
  const [subcategoryId, setSubcategoryId] = useState<string>(client?.client_subcategory_id || '');
  const tagsRef = useRef<TagsInputHandle>(null);

  const { data: categories = [], isLoading: loadingCategories } = useQuery({
    queryKey: ["client-categories"],
    queryFn: fetchClientCategories,
  });

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === categoryId),
    [categories, categoryId],
  );

  // Inactive categories stay visible on clients that already use them, but
  // cannot be picked for a different client.
  const selectableCategories = useMemo(
    () => categories.filter((c) => c.is_active || c.id === client?.client_category_id),
    [categories, client?.client_category_id],
  );

  const selectableSubcategories = useMemo(
    () =>
      (selectedCategory?.subcategories ?? []).filter(
        (s) => s.is_active || s.id === client?.client_subcategory_id,
      ),
    [selectedCategory, client?.client_subcategory_id],
  );

  const handleChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleCategoryChange = (value: string) => {
    setCategoryId(value);
    // Drop a subcategory that no longer belongs to the selected category.
    const next = categories.find((c) => c.id === value);
    const stillValid = (next?.subcategories ?? []).some((s) => s.id === subcategoryId);
    if (!stillValid) setSubcategoryId('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Flush any pending tag draft so users don't lose unsaved keywords
    const finalKeywords = tagsRef.current?.commit() ?? formData.keywords;
    const subcategory = selectableSubcategories.find((s) => s.id === subcategoryId);
    onSubmit({
      id: client?.id,
      name: formData.name,
      // Legacy text columns are kept in sync with the new taxonomy.
      category: selectedCategory?.name || client?.category || 'OTRO',
      subcategory: subcategory?.name || null,
      keywords: finalKeywords,
      client_category_id: categoryId || null,
      client_subcategory_id: subcategoryId || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nombre del cliente</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="Nombre del cliente"
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label>Clasificación del Cliente</Label>
        <p className="text-xs text-muted-foreground">
          Industria del cliente. Es independiente de las Categorías de Noticias que clasifican el contenido.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="client-category" className="text-xs font-normal text-muted-foreground">
              Categoría del Cliente
            </Label>
            <Select value={categoryId} onValueChange={handleCategoryChange} required>
              <SelectTrigger id="client-category">
                <SelectValue placeholder={loadingCategories ? "Cargando..." : "Seleccione una categoría"} />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {selectableCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                    {!cat.is_active ? " (inactiva)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="client-subcategory" className="text-xs font-normal text-muted-foreground">
              Subcategoría
            </Label>
            {!categoryId ? (
              <p className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
                Seleccione una categoría primero
              </p>
            ) : selectableSubcategories.length === 0 ? (
              <p className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
                Esta categoría no tiene subcategorías
              </p>
            ) : (
              <Select
                value={subcategoryId || "none"}
                onValueChange={(v) => setSubcategoryId(v === "none" ? "" : v)}
              >
                <SelectTrigger id="client-subcategory">
                  <SelectValue placeholder="Sin subcategoría" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="none">Sin subcategoría</SelectItem>
                  {selectableSubcategories.map((sub) => (
                    <SelectItem key={sub.id} value={sub.id}>
                      {sub.name}
                      {!sub.is_active ? " (inactiva)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="keywords">Palabras clave</Label>
        <TagsInput
          ref={tagsRef}
          id="keywords"
          value={formData.keywords}
          onChange={(tags) => setFormData((prev) => ({ ...prev, keywords: tags }))}
          placeholder="Añade una palabra clave y presiona coma o Enter"
        />
        <p className="text-xs text-muted-foreground">
          Ingrese palabras clave separadas por comas. Haz clic en una etiqueta para corregirla, o usa la X para eliminarla. Los acentos y mayúsculas no son necesarios — por ejemplo, <code>Pérez</code> también encuentra <code>Perez</code>.
        </p>
      </div>
      
      <div className="flex justify-end space-x-2 pt-2">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
        >
          Cancelar
        </Button>
        <Button type="submit">
          {isEditing ? 'Guardar cambios' : 'Añadir cliente'}
        </Button>
      </div>
    </form>
  );
}
