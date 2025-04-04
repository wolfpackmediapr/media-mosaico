
import { useEffect } from "react";
import { createPressCrudHook } from "./usePressCrud";
import { 
  fetchPressSources,
  createPressSource,
  updatePressSource,
  deletePressSource
} from "@/services/press/pressService";
import { PressSourceType } from "@/services/press/types";

const usePressCrud = createPressCrudHook<PressSourceType>(
  fetchPressSources,
  (name) => createPressSource({ name }),
  (id, name) => updatePressSource({ id, name }),
  deletePressSource,
  "fuente"
);

export function usePressSources() {
  const { 
    items: sources,
    loading: loadingSources,
    loadItems: loadSources,
    addItem: addSource,
    updateItemById: updateSource,
    removeItem: removeSource
  } = usePressCrud();

  useEffect(() => {
    loadSources();
  }, [loadSources]);

  return {
    sources,
    loadingSources,
    loadSources,
    addSource,
    updateSource,
    removeSource
  };
}
