
import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { TagsInput, type TagsInputHandle } from "@/components/ui/tags-input";
import { Client } from "@/services/clients/clientService";
import { fetchClientCategories } from "@/services/clients/clientCategoriesService";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Check, ChevronsUpDown, X } from "lucide-react";

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
    aliases: (client?.aliases ?? []) as string[],
  });
  const [categoryId, setCategoryId] = useState<string>(client?.client_category_id || '');
  const [subcategoryIds, setSubcategoryIds] = useState<string[]>(
    client?.subcategory_ids ?? (client?.client_subcategory_id ? [client.client_subcategory_id] : []),
  );
  const [pendingCategory, setPendingCategory] = useState<string | null>(null);
  const [subPickerOpen, setSubPickerOpen] = useState(false);
  const tagsRef = useRef<TagsInputHandle>(null);
  const aliasRef = useRef<TagsInputHandle>(null);

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
        (s) => s.is_active || subcategoryIds.includes(s.id),
      ),
    [selectedCategory, subcategoryIds],
  );

  const selectedSubcategories = useMemo(
    () => selectableSubcategories.filter((s) => subcategoryIds.includes(s.id)),
    [selectableSubcategories, subcategoryIds],
  );

  const handleChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const applyCategory = (value: string) => {
    setCategoryId(value);
    const next = categories.find((c) => c.id === value);
    const validIds = new Set((next?.subcategories ?? []).map((s) => s.id));
    setSubcategoryIds((prev) => prev.filter((id) => validIds.has(id)));
  };

  const handleCategoryChange = (value: string) => {
    if (value === categoryId) return;
    const next = categories.find((c) => c.id === value);
    const validIds = new Set((next?.subcategories ?? []).map((s) => s.id));
    const dropped = subcategoryIds.filter((id) => !validIds.has(id));
    // Confirm before discarding subcategories that don't fit the new category.
    if (dropped.length > 0) {
      setPendingCategory(value);
      return;
    }
    applyCategory(value);
  };

  const droppedNames = useMemo(() => {
    if (!pendingCategory) return [] as string[];
    const next = categories.find((c) => c.id === pendingCategory);
    const validIds = new Set((next?.subcategories ?? []).map((s) => s.id));
    return selectedSubcategories.filter((s) => !validIds.has(s.id)).map((s) => s.name);
  }, [pendingCategory, categories, selectedSubcategories]);

  const toggleSubcategory = (id: string) => {
    setSubcategoryIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Flush any pending tag draft so users don't lose unsaved keywords
    const finalKeywords = tagsRef.current?.commit() ?? formData.keywords;
    const finalAliases = aliasRef.current?.commit() ?? formData.aliases;
    const primarySub = selectedSubcategories[0];
    onSubmit({
      id: client?.id,
      name: formData.name,
      // Legacy text columns are kept in sync with the new taxonomy.
      category: selectedCategory?.name || client?.category || 'OTRO',
      subcategory: primarySub?.name || null,
      keywords: finalKeywords,
      aliases: finalAliases,
      client_category_id: categoryId || null,
      client_subcategory_id: primarySub?.id || null,
      subcategory_ids: selectedSubcategories.map((s) => s.id),
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
