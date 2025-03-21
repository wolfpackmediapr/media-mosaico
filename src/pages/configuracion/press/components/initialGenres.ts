
import { Genre } from "../types/press-types";

export const getInitialGenres = (): Genre[] => {
  return [
    { id: "1", name: "ARTÍCULO" },
    { id: "2", name: "COLUMNA" },
    { id: "3", name: "COMENTARIO" },
    { id: "4", name: "CRÍTICA" },
    { id: "5", name: "EDITORIAL" },
    { id: "6", name: "ENCUESTA" },
    { id: "7", name: "ENTREVISTA" },
    { id: "8", name: "NOTA COMENTADA" },
    { id: "9", name: "NOTA INFORMATIVA" },
    { id: "10", name: "REPORTAJE" },
    { id: "11", name: "RESEÑA" },
    { id: "12", name: "SALUD" },
  ];
};
