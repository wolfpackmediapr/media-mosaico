
import { useEffect } from "react";
import { createPressCrudHook } from "./usePressCrud";
import { 
  fetchPressGenres,
  createPressGenre,
  updatePressGenre,
  deletePressGenre
} from "@/services/press/pressService";
import { PressGenreType } from "@/services/press/types";

const usePressCrud = createPressCrudHook<PressGenreType>(
  fetchPressGenres,
  (name) => createPressGenre({ name }),
  (id, name) => updatePressGenre({ id, name }),
  deletePressGenre,
  "género"
);

export function usePressGenres() {
  const { 
    items: genres,
    loading: loadingGenres,
    loadItems: loadGenres,
    addItem: addGenre,
    updateItemById: updateGenre,
    removeItem: removeGenre
  } = usePressCrud();

  useEffect(() => {
    loadGenres();
  }, [loadGenres]);

  return {
    genres,
    loadingGenres,
    loadGenres,
    addGenre,
    updateGenre,
    removeGenre
  };
}
