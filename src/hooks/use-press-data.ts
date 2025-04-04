
import { useState, useEffect } from "react";
import { Source, Genre } from "@/pages/configuracion/press/types/press-types";
import { ParticipantCategoryType, ParticipantType } from "@/services/participantes/types";
import { MediaOutlet } from "@/services/media/mediaService";
import { toast } from "sonner";
import {
  fetchMediaSources,
  fetchInstitutions,
  fetchInstitutionCategories,
  fetchParticipants
} from "@/services/press/pressService";

// Fixed categories for news
export const NEWS_CATEGORIES = [
  "Accidentes", "Agencias de Gobierno", "Ambiente", "Ambiente & El Tiempo", 
  "Ciencia & Tecnología", "Comunidad", "Crimen", "Deportes", "Economía & Negocios", 
  "Educación & Cultura", "EE.UU. & Internacionales", "Entretenimiento", "Gobierno", 
  "Otras", "Política", "Religión", "Salud", "Tribunales"
];

// Fixed genres for news
export const GENRE_OPTIONS = [
  "Artículo", "Columna", "Comentario", "Crítica", "Editorial", "Encuesta", 
  "Entrevista", "Nota Comentada", "Nota Informativa", "Reportaje", "Reseña", "Salud"
];

// Fixed headline types
export const HEADLINE_OPTIONS = ["Llamativo", "Informativo"];

// Fixed color options for advertisements
export const COLOR_OPTIONS = ["Blanco y negro", "Un color", "Dos Colores", "Full color"];

export function usePressData() {
  // Media sources
  const [sources, setSources] = useState<Array<{id: string, name: string}>>([]);
  const [loadingSources, setLoadingSources] = useState(false);
  
  // Institutions
  const [institutions, setInstitutions] = useState<Array<{id: string, name: string}>>([]);
  const [loadingInstitutions, setLoadingInstitutions] = useState(false);
  
  // Institution categories
  const [institutionCategories, setInstitutionCategories] = useState<Array<{id: string, name: string}>>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  
  // Participants
  const [participants, setParticipants] = useState<Array<{id: string, name: string}>>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);

  // Fetch media sources (from press settings)
  const fetchSources = async () => {
    setLoadingSources(true);
    try {
      const sourcesData = await fetchMediaSources();
      setSources(sourcesData);
    } catch (error) {
      console.error("Error fetching sources:", error);
      toast.error("Error al cargar los medios");
    } finally {
      setLoadingSources(false);
    }
  };

  // Fetch institutions
  const fetchInstitutionsData = async () => {
    setLoadingInstitutions(true);
    try {
      const institutionsData = await fetchInstitutions();
      setInstitutions(institutionsData);
    } catch (error) {
      console.error("Error fetching institutions:", error);
      toast.error("Error al cargar las instituciones");
    } finally {
      setLoadingInstitutions(false);
    }
  };

  // Fetch institution categories
  const fetchInstitutionCategoriesData = async () => {
    setLoadingCategories(true);
    try {
      const categoriesData = await fetchInstitutionCategories();
      setInstitutionCategories(categoriesData);
    } catch (error) {
      console.error("Error fetching institution categories:", error);
      toast.error("Error al cargar las categorías de instituciones");
    } finally {
      setLoadingCategories(false);
    }
  };

  // Fetch participants
  const fetchParticipantsData = async () => {
    setLoadingParticipants(true);
    try {
      const participantsData = await fetchParticipants();
      setParticipants(participantsData);
    } catch (error) {
      console.error("Error fetching participants:", error);
      toast.error("Error al cargar los participantes");
    } finally {
      setLoadingParticipants(false);
    }
  };

  // Fetch all data on component mount
  useEffect(() => {
    fetchSources();
    fetchInstitutionsData();
    fetchInstitutionCategoriesData();
    fetchParticipantsData();
  }, []);

  return {
    sources,
    institutions,
    institutionCategories,
    participants,
    loadingSources,
    loadingInstitutions,
    loadingCategories,
    loadingParticipants,
    refetchSources: fetchSources,
    refetchInstitutions: fetchInstitutionsData,
    refetchCategories: fetchInstitutionCategoriesData,
    refetchParticipants: fetchParticipantsData
  };
}
