
import { Source } from "../types/press-types";

export const getInitialRates = (): Source[] => {
  return [
    { id: "1", name: "PLANA COMPLETA" },
    { id: "2", name: "MEDIA PLANA" },
    { id: "3", name: "CUARTO DE PLANA" },
    { id: "4", name: "OCTAVO DE PLANA" },
    { id: "5", name: "ROBAPLANA" },
    { id: "6", name: "CINTILLO" },
    { id: "7", name: "MÓDULO" },
    { id: "8", name: "PUBLICIDAD ESPECIAL" },
  ];
};
