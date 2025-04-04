
import { v4 as uuidv4 } from 'uuid';
import { ParticipantType, ParticipantCategoryType } from './types';

// Initial categories
const initialCategories: ParticipantCategoryType[] = [
  { id: '1', name: 'ACTORES' },
  { id: '2', name: 'ALCALDES' },
  { id: '3', name: 'ASOCIACIONES' },
  { id: '4', name: 'BANCOS - CUENTA DE CHEQUE' },
  { id: '5', name: 'BIO-CELSIUS' },
  { id: '6', name: 'CAMARA DE REPRESENTANTES' },
  { id: '7', name: 'COMISIONADOS' },
  { id: '8', name: 'COMUNIDAD' },
  { id: '9', name: 'DEPORTISTAS' },
  { id: '10', name: 'DIRECTORES' },
  { id: '11', name: 'EPIDEMIOLOGOS' },
  { id: '12', name: 'EX GOBERNADORES' },
  { id: '13', name: 'FINANZAS' },
  { id: '14', name: 'FISCALES' },
  { id: '15', name: 'GOBERNADORES' },
  { id: '16', name: 'GOBIERNO' },
  { id: '17', name: 'INDUSTRIAS' },
  { id: '18', name: 'INSTITUCIONES REGLAMENTADORAS' },
  { id: '19', name: 'MIEMBROS DEL GOBIERNO' },
  { id: '20', name: 'ORGANIZACIONES SIN FINES DE LUCRO' },
  { id: '21', name: 'POLITICA' },
  { id: '22', name: 'PROCURADORES' },
  { id: '23', name: 'SECRETARIOS' },
  { id: '24', name: 'SENADO' },
  { id: '25', name: 'UNIONES Y SINDICATOS' }
];

// Initial sample of participants
const initialParticipants: ParticipantType[] = [
  { id: '1', name: 'JOSE APONTE HERNANDEZ', category: 'CAMARA DE REPRESENTANTES', position: 'REPRESENTANTE PNP' },
  { id: '2', name: 'TOMAS BONILLA FELICIANO', category: 'CAMARA DE REPRESENTANTES', position: 'REPRESENTANTE PNP' },
  { id: '3', name: 'ANGEL L. BULERIN RAMOS', category: 'CAMARA DE REPRESENTANTES', position: 'REPRESENTANTE PNP' },
  { id: '4', name: 'LUCY ARCE FERRE', category: 'SENADO', position: 'SENADORA PNP' },
  { id: '5', name: 'NORMA BURGOS ANDUJAR', category: 'SENADO', position: 'SENADORA PNP' },
  { id: '6', name: 'JAIME BARLUCEA MALDONADO (PNP)', category: 'ALCALDES', position: 'ALCALDE DE ADJUNTAS' },
  { id: '7', name: 'BERTY ECHEVARRIA (PNP)', category: 'ALCALDES', position: 'ALCALDE DE AGUADA' },
  { id: '8', name: 'CARLOS MENDEZ MARTINEZ (PNP)', category: 'ALCALDES', position: 'ALCALDE DE AGUADILLA' },
  { id: '9', name: 'ANIBAL ACEVEDO VILA', category: 'GOBERNADORES', position: 'EX-GOBERNADOR DE PUERTO RICO' },
  { id: '10', name: 'MIGUEL COTTO', category: 'DEPORTISTAS', position: 'BOXEADOR' }
];

// For local development we'll use localStorage
const PARTICIPANTS_STORAGE_KEY = 'app_participants';
const CATEGORIES_STORAGE_KEY = 'app_participant_categories';

// Helper to get data from localStorage with fallback to initial data
const getStoredParticipants = (): ParticipantType[] => {
  const stored = localStorage.getItem(PARTICIPANTS_STORAGE_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  localStorage.setItem(PARTICIPANTS_STORAGE_KEY, JSON.stringify(initialParticipants));
  return initialParticipants;
};

const getStoredCategories = (): ParticipantCategoryType[] => {
  const stored = localStorage.getItem(CATEGORIES_STORAGE_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(initialCategories));
  return initialCategories;
};

// Participant functions
export const fetchParticipants = async (): Promise<ParticipantType[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(getStoredParticipants());
    }, 500); // simulate network delay
  });
};

export const createParticipant = async (participantData: Omit<ParticipantType, 'id'>): Promise<ParticipantType> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const participants = getStoredParticipants();
      const newParticipant = {
        ...participantData,
        id: uuidv4()
      };
      
      participants.push(newParticipant);
      localStorage.setItem(PARTICIPANTS_STORAGE_KEY, JSON.stringify(participants));
      
      resolve(newParticipant);
    }, 500);
  });
};

export const updateParticipant = async (participantData: ParticipantType): Promise<ParticipantType> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const participants = getStoredParticipants();
      const index = participants.findIndex(p => p.id === participantData.id);
      
      if (index !== -1) {
        participants[index] = participantData;
        localStorage.setItem(PARTICIPANTS_STORAGE_KEY, JSON.stringify(participants));
      }
      
      resolve(participantData);
    }, 500);
  });
};

export const deleteParticipant = async (id: string): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const participants = getStoredParticipants();
      const updatedParticipants = participants.filter(p => p.id !== id);
      localStorage.setItem(PARTICIPANTS_STORAGE_KEY, JSON.stringify(updatedParticipants));
      resolve();
    }, 500);
  });
};

// Category functions
export const fetchCategories = async (): Promise<ParticipantCategoryType[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(getStoredCategories());
    }, 500);
  });
};

export const createCategory = async (categoryData: Omit<ParticipantCategoryType, 'id'>): Promise<ParticipantCategoryType> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const categories = getStoredCategories();
      const newCategory = {
        ...categoryData,
        id: uuidv4()
      };
      
      categories.push(newCategory);
      localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
      
      resolve(newCategory);
    }, 500);
  });
};

export const updateCategory = async (categoryData: ParticipantCategoryType): Promise<ParticipantCategoryType> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const categories = getStoredCategories();
      const index = categories.findIndex(c => c.id === categoryData.id);
      
      if (index !== -1) {
        categories[index] = categoryData;
        localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
      }
      
      resolve(categoryData);
    }, 500);
  });
};

export const deleteCategory = async (id: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // Check if category is in use by any participant
      const participants = getStoredParticipants();
      const categoryInUse = participants.some(p => p.category === id);
      
      if (categoryInUse) {
        reject(new Error('No se puede eliminar esta categoría porque está siendo utilizada por participantes.'));
        return;
      }
      
      const categories = getStoredCategories();
      const updatedCategories = categories.filter(c => c.id !== id);
      localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(updatedCategories));
      resolve();
    }, 500);
  });
};
