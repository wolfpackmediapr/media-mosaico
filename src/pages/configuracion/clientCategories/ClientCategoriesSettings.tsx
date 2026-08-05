import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SettingsLayout } from "@/components/settings/SettingsLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Search, Trash2, Pencil } from "lucide-react";
import {
  ClientCategory,
  ClientSubcategory,
  createClientCategory,
  createClientSubcategory,
  deleteClientCategory,
  deleteClientSubcategory,
  fetchClientCategories,
  fetchClientCategoryUsage,
  updateClientCategory,
  updateClientSubcategory,
} from "@/services/clients/clientCategoriesService";

type EditTarget =
  | { kind: "category"; record?: ClientCategory }
  | { kind: "subcategory"; category: ClientCategory; record?: ClientSubcategory };

export default function ClientCategoriesSettings() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");

  const { data: categories, isLoading } = useQuery({
    queryKey: ["client-categories"],
    queryFn: fetchClientCategories,
  });

  const { data: usage } = useQuery({
    queryKey: ["client-categories-usage"],
    queryFn: fetchClientCategoryUsage,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["client-categories"] });
    queryClient.invalidateQueries({ queryKey: ["client-categories-usage"] });
    queryClient.invalidateQueries({ queryKey: ["clients"] });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!editTarget) return;
      const name = formName.trim();
      if (!name) throw new Error("El nombre es obligatorio");

      if (editTarget.kind === "category") {
        return editTarget.record
          ? updateClientCategory(editTarget.record.id, { name, description: formDescription })
          : createClientCategory({ name, description: formDescription });
      }
      return editTarget.record
        ? updateClientSubcategory(editTarget.record.id, { name, description: formDescription })
        : createClientSubcategory({
            category_id: editTarget.category.id,
            categorySlug: editTarget.category.slug,
            name,
            description: formDescription,
          });
    },
    onSuccess: () => {
      invalidate();
      toast.success("Guardado correctamente");
      setEditTarget(null);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const toggleCategory = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updateClientCategory(id, { is_active: isActive }),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleSubcategory = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updateClientSubcategory(id, { is_active: isActive }),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const removeCategory = useMutation({
    mutationFn: ({ id, count }: { id: string; count: number }) => deleteClientCategory(id, count),
    onSuccess: () => {
      invalidate();
      toast.success("Categoría eliminada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeSubcategory = useMutation({
    mutationFn: ({ id, count }: { id: string; count: number }) => deleteClientSubcategory(id, count),
    onSuccess: () => {
      invalidate();
      toast.success("Subcategoría eliminada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openForm = (target: EditTarget) => {
    setEditTarget(target);
    setFormName(target.record?.name ?? "");
    setFormDescription(target.record?.description ?? "");
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term || !categories) return categories ?? [];
    return categories
      .map((cat) => {
        const catMatches = cat.name.toLowerCase().includes(term);
        const subs = (cat.subcategories ?? []).filter((s) => s.name.toLowerCase().includes(term));
        if (catMatches) return cat;
        if (subs.length > 0) return { ...cat, subcategories: subs };
        return null;
      })
      .filter(Boolean) as ClientCategory[];
  }, [categories, search]);

  return (
    <SettingsLayout
      title="Categorías de Clientes"
      description="Taxonomía de industrias para clasificar a los clientes de Publimedia. Es independiente de las Categorías de Noticias."
    >
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Taxonomía de Clientes</CardTitle>
            <CardDescription>
              Estas categorías se usan para clasificar clientes y mejorar la relevancia del análisis de IA.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar categoría..."
                className="pl-8 w-full sm:w-[220px]"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button onClick={() => openForm({ kind: "category" })}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva categoría
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No se encontraron categorías.</p>
          ) : (
            <Accordion type="multiple" className="w-full">
              {filtered.map((cat) => {
                const catUsage = usage?.byCategory[cat.id] ?? 0;
                return (
                  <AccordionItem key={cat.id} value={cat.id}>
                    <div className="flex items-center gap-2 pr-1">
                      <AccordionTrigger className="flex-1">
                        <span className="flex flex-wrap items-center gap-2 text-left">
                          <span className={cat.is_active ? "" : "text-muted-foreground line-through"}>
                            {cat.name}
                          </span>
                          <Badge variant="secondary">{cat.subcategories?.length ?? 0} subcat.</Badge>
                          <Badge variant="outline">{catUsage} cliente(s)</Badge>
                        </span>
                      </AccordionTrigger>
                      <Switch
                        checked={cat.is_active}
                        onCheckedChange={(v) => toggleCategory.mutate({ id: cat.id, isActive: v })}
                        aria-label="Activar categoría"
                      />
                      <Button variant="ghost" size="icon" onClick={() => openForm({ kind: "category", record: cat })}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (catUsage > 0 || (cat.subcategories?.length ?? 0) > 0) {
                            toast.error(
                              catUsage > 0
                                ? `${catUsage} cliente(s) usan esta categoría. Desactívala en su lugar.`
                                : "Elimina primero sus subcategorías o desactívala.",
                            );
                            return;
                          }
                          if (confirm(`¿Eliminar la categoría "${cat.name}"?`)) {
                            removeCategory.mutate({ id: cat.id, count: catUsage });
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>

                    <AccordionContent>
                      <div className="space-y-2 pl-2">
                        {(cat.subcategories ?? []).length === 0 ? (
                          <p className="text-sm text-muted-foreground">Sin subcategorías.</p>
                        ) : (
                          (cat.subcategories ?? []).map((sub) => {
                            const subUsage = usage?.bySubcategory[sub.id] ?? 0;
                            return (
                              <div
                                key={sub.id}
                                className="flex items-center justify-between rounded-md border px-3 py-2"
                              >
                                <span className="flex flex-wrap items-center gap-2">
                                  <span className={sub.is_active ? "" : "text-muted-foreground line-through"}>
                                    {sub.name}
                                  </span>
                                  {subUsage > 0 && <Badge variant="outline">{subUsage} cliente(s)</Badge>}
                                </span>
                                <span className="flex items-center gap-2">
                                  <Switch
                                    checked={sub.is_active}
                                    onCheckedChange={(v) =>
                                      toggleSubcategory.mutate({ id: sub.id, isActive: v })
                                    }
                                    aria-label="Activar subcategoría"
                                  />
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => openForm({ kind: "subcategory", category: cat, record: sub })}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      if (subUsage > 0) {
                                        toast.error(
                                          `${subUsage} cliente(s) usan esta subcategoría. Desactívala en su lugar.`,
                                        );
                                        return;
                                      }
                                      if (confirm(`¿Eliminar la subcategoría "${sub.name}"?`)) {
                                        removeSubcategory.mutate({ id: sub.id, count: subUsage });
                                      }
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </span>
                              </div>
                            );
                          })
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openForm({ kind: "subcategory", category: cat })}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Añadir subcategoría
                        </Button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editTarget?.record ? "Editar" : "Nueva"}{" "}
              {editTarget?.kind === "subcategory" ? "subcategoría" : "categoría"}
            </DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate();
            }}
          >
            {editTarget?.kind === "subcategory" && (
              <p className="text-sm text-muted-foreground">
                Categoría: <strong>{editTarget.category.name}</strong>
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="cat-name">Nombre</Label>
              <Input
                id="cat-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Nombre"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-desc">Descripción (opcional)</Label>
              <Input
                id="cat-desc"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Descripción"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditTarget(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                Guardar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </SettingsLayout>
  );
}