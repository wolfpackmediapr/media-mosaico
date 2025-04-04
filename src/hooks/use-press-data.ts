
import { useState, useEffect } from "react";
import { Source, Genre } from "@/pages/configuracion/press/types/press-types";
import { ParticipantCategoryType, ParticipantType } from "@/services/participantes/types";
import { MediaOutlet } from "@/services/media/mediaService";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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
      // In a real implementation, this would be an API call
      // For now we'll use mock data
      setTimeout(() => {
        setSources([
          { id: "1", name: "El Nuevo Día" },
          { id: "2", name: "Primera Hora" },
          { id: "3", name: "El Vocero" },
          { id: "4", name: "Caribbean Business" },
          { id: "5", name: "Metro" }
        ]);
        setLoadingSources(false);
      }, 500);
    } catch (error) {
      console.error("Error fetching sources:", error);
      toast.error("Error al cargar los medios");
      setLoadingSources(false);
    }
  };

  // Fetch institutions
  const fetchInstitutions = async () => {
    setLoadingInstitutions(true);
    try {
      // In a real implementation, this would be an API call
      setTimeout(() => {
        setInstitutions([
          { id: "1", name: "Gobierno de Puerto Rico" },
          { id: "2", name: "Universidad de Puerto Rico" },
          { id: "3", name: "Departamento de Salud" },
          { id: "4", name: "Fondo Monetario Internacional" },
          { id: "5", name: "Banco Popular" }
        ]);
        setLoadingInstitutions(false);
      }, 600);
    } catch (error) {
      console.error("Error fetching institutions:", error);
      toast.error("Error al cargar las instituciones");
      setLoadingInstitutions(false);
    }
  };

  // Fetch institution categories
  const fetchInstitutionCategories = async () => {
    setLoadingCategories(true);
    try {
      // In a real implementation, this would be an API call
      setTimeout(() => {
        setInstitutionCategories([
          { id: "1", name: "Gobierno" },
          { id: "2", name: "Educación" },
          { id: "3", name: "Salud" },
          { id: "4", name: "Finanzas" },
          { id: "5", name: "Bancos" },
          { id: "6", name: "Aseguradoras" },
          { id: "7", name: "Organizaciones Sin Fines de Lucro" }
        ]);
        setLoadingCategories(false);
      }, 550);
    } catch (error) {
      console.error("Error fetching institution categories:", error);
      toast.error("Error al cargar las categorías de instituciones");
      setLoadingCategories(false);
    }
  };

  // Fetch participants
  const fetchParticipants = async () => {
    setLoadingParticipants(true);
    try {
      // Get participants from Supabase
      const { data, error } = await supabase
        .from('participants')
        .select('id, name')
        .order('name');
      
      if (error) {
        throw error;
      }
      
      setParticipants(data || []);
      setLoadingParticipants(false);
    } catch (error) {
      console.error("Error fetching participants:", error);
      toast.error("Error al cargar los participantes");
      setLoadingParticipants(false);
    }
  };

  // Fetch all data on component mount
  useEffect(() => {
    fetchSources();
    fetchInstitutions();
    fetchInstitutionCategories();
    fetchParticipants();
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
    refetchInstitutions: fetchInstitutions,
    refetchCategories: fetchInstitutionCategories,
    refetchParticipants: fetchParticipants
  };
}
