
import { useState } from "react";
import { toast } from "sonner";
import { RateType } from "./types";

interface UseRatesCrudProps<T extends RateType> {
  createRate: (rateData: Omit<T, 'id' | 'created_at'>) => Promise<any>;
  updateRate: (rateData: Omit<T, 'created_at'>) => Promise<any>;
  deleteRate: (id: string) => Promise<any>;
  loadData: () => Promise<void>;
  mediaType: 'tv' | 'radio';
}

interface UseRatesCrudReturn<T extends RateType> {
  isAddingNew: boolean;
  editingId: string | null;
  setIsAddingNew: (isAdding: boolean) => void;
  setEditingId: (id: string | null) => void;
  handleAddRate: (rateData: Omit<T, 'id' | 'created_at'>) => Promise<void>;
  handleEditRate: (id: string) => void;
  handleSaveEdit: (rateData: Omit<T, 'created_at'>) => Promise<void>;
  handleDeleteRate: (id: string) => Promise<void>;
}

export function useRatesCrud<T extends RateType>({
  createRate,
  updateRate,
  deleteRate,
  loadData,
  mediaType
}: UseRatesCrudProps<T>): UseRatesCrudReturn<T> {
  const [isAddingNew, setIsAddingNew] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleAddRate = async (rateData: Omit<T, 'id' | 'created_at'>) => {
    try {
      await createRate(rateData);
      toast.success("Tarifa añadida correctamente");
      await loadData();
      setIsAddingNew(false);
    } catch (error) {
      console.error(`Error adding ${mediaType} rate:`, error);
      toast.error(`Error al añadir la tarifa de ${mediaType === 'tv' ? 'televisión' : 'radio'}`);
      throw error;
    }
  };

  const handleEditRate = (rateId: string) => {
    setEditingId(rateId);
  };

  const handleSaveEdit = async (rateData: Omit<T, 'created_at'>) => {
    try {
      await updateRate(rateData);
      toast.success("Tarifa actualizada correctamente");
      await loadData();
      setEditingId(null);
    } catch (error) {
      console.error(`Error updating ${mediaType} rate:`, error);
      toast.error(`Error al actualizar la tarifa de ${mediaType === 'tv' ? 'televisión' : 'radio'}`);
      throw error;
    }
  };

  const handleDeleteRate = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta tarifa?")) {
      return;
    }
    
    try {
      await deleteRate(id);
      toast.success("Tarifa eliminada correctamente");
      await loadData();
    } catch (error) {
      console.error(`Error deleting ${mediaType} rate:`, error);
      toast.error(`Error al eliminar la tarifa de ${mediaType === 'tv' ? 'televisión' : 'radio'}`);
    }
  };

  return {
    isAddingNew,
    editingId,
    setIsAddingNew,
    setEditingId,
    handleAddRate,
    handleEditRate,
    handleSaveEdit,
    handleDeleteRate
  };
}
