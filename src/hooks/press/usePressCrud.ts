
import { useState, useCallback } from "react";
import { toast } from "sonner";

// Generic CRUD hook factory for press settings
export function createPressCrudHook<T extends { id: string; name: string }>(
  fetchItems: () => Promise<T[]>,
  createItem: (name: string) => Promise<any>,
  updateItem: (id: string, name: string) => Promise<any>,
  deleteItem: (id: string) => Promise<any>,
  itemType: string
) {
  return function usePressCrud() {
    const [items, setItems] = useState<T[]>([]);
    const [loading, setLoading] = useState<boolean>(false);

    const loadItems = useCallback(async () => {
      setLoading(true);
      try {
        const data = await fetchItems();
        setItems(data);
      } catch (error) {
        console.error(`Error loading ${itemType}:`, error);
        toast.error(`Error al cargar los ${itemType}`);
      } finally {
        setLoading(false);
      }
    }, []);

    const addItem = async (name: string): Promise<boolean> => {
      try {
        await createItem(name);
        toast.success(`${itemType} creado exitosamente`);
        loadItems();
        return true;
      } catch (error) {
        console.error(`Error adding ${itemType}:`, error);
        toast.error(`Error al crear el ${itemType}`);
        return false;
      }
    };

    const updateItemById = async (id: string, name: string): Promise<boolean> => {
      try {
        await updateItem(id, name);
        toast.success(`${itemType} actualizado exitosamente`);
        loadItems();
        return true;
      } catch (error) {
        console.error(`Error updating ${itemType}:`, error);
        toast.error(`Error al actualizar el ${itemType}`);
        return false;
      }
    };

    const removeItem = async (id: string): Promise<boolean> => {
      try {
        await deleteItem(id);
        toast.success(`${itemType} eliminado exitosamente`);
        loadItems();
        return true;
      } catch (error) {
        console.error(`Error removing ${itemType}:`, error);
        toast.error(`Error al eliminar el ${itemType}`);
        return false;
      }
    };

    return {
      items,
      loading,
      loadItems,
      addItem,
      updateItemById,
      removeItem
    };
  };
}
