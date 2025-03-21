
import { Source } from "../types/press-types";

export const getInitialSections = (): Source[] => {
  return [
    { id: "1", name: "PORTADA" },
    { id: "2", name: "OPINIÓN" },
    { id: "3", name: "NACIONAL" },
    { id: "4", name: "INTERNACIONAL" },
    { id: "5", name: "ECONOMÍA" },
    { id: "6", name: "SOCIEDAD" },
    { id: "7", name: "CULTURA" },
    { id: "8", name: "DEPORTES" },
    { id: "9", name: "CIENCIA" },
    { id: "10", name: "TECNOLOGÍA" },
    { id: "11", name: "ENTRETENIMIENTO" },
    { id: "12", name: "SALUD" },
  ];
};
