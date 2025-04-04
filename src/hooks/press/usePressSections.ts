
import { useEffect } from "react";
import { createPressCrudHook } from "./usePressCrud";
import { 
  fetchPressSections,
  createPressSection,
  updatePressSection,
  deletePressSection
} from "@/services/press/pressService";
import { PressSectionType } from "@/services/press/types";

const usePressCrud = createPressCrudHook<PressSectionType>(
  fetchPressSections,
  (name) => createPressSection({ name }),
  (id, name) => updatePressSection({ id, name }),
  deletePressSection,
  "sección"
);

export function usePressSections() {
  const { 
    items: sections,
    loading: loadingSections,
    loadItems: loadSections,
    addItem: addSection,
    updateItemById: updateSection,
    removeItem: removeSection
  } = usePressCrud();

  useEffect(() => {
    loadSections();
  }, [loadSections]);

  return {
    sections,
    loadingSections,
    loadSections,
    addSection,
    updateSection,
    removeSection
  };
}
