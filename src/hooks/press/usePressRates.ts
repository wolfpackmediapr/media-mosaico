
import { useEffect } from "react";
import { createPressCrudHook } from "./usePressCrud";
import { 
  fetchPressRates,
  createPressRate,
  updatePressRate,
  deletePressRate
} from "@/services/press/pressService";
import { PressRateType } from "@/services/press/types";

const usePressCrud = createPressCrudHook<PressRateType>(
  fetchPressRates,
  (name) => createPressRate({ name }),
  (id, name) => updatePressRate({ id, name }),
  deletePressRate,
  "tarifa"
);

export function usePressRates() {
  const { 
    items: rates,
    loading: loadingRates,
    loadItems: loadRates,
    addItem: addRate,
    updateItemById: updateRate,
    removeItem: removeRate
  } = usePressCrud();

  useEffect(() => {
    loadRates();
  }, [loadRates]);

  return {
    rates,
    loadingRates,
    loadRates,
    addRate,
    updateRate,
    removeRate
  };
}
