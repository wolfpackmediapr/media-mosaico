
export interface RateType {
  id: string;
  days: string[];
  start_time: string;
  end_time: string;
  rate_15s: number | null;
  rate_30s: number | null;
  rate_45s: number | null;
  rate_60s: number | null;
  created_at?: string;
  [key: string]: any; // For additional properties like channel/station_name, program_name
}

export interface MediaType {
  id: string;
  name: string;
  [key: string]: any;
}

export interface ProgramType {
  id: string;
  name: string;
  [key: string]: any;
}

export interface UseRatesManagementProps<
  T extends RateType,
  M extends MediaType,
  P extends ProgramType
> {
  fetchRates: () => Promise<T[]>;
  createRate: (rateData: Omit<T, 'id' | 'created_at'>) => Promise<any>;
  updateRate: (rateData: Omit<T, 'created_at'>) => Promise<any>;
  deleteRate: (id: string) => Promise<any>;
  fetchMedia: () => Promise<M[]>;
  fetchPrograms: () => Promise<P[]>;
  mediaType: 'tv' | 'radio';
  mediaIdField: string;
  programIdField: string;
  mediaNameField?: string;
  programNameField?: string;
}

export interface UseRatesManagementReturn<
  T extends RateType,
  M extends MediaType,
  P extends ProgramType
> {
  rates: T[];
  filteredRates: T[];
  media: M[];
  programs: P[];
  loading: boolean;
  isLoading: boolean;
  selectedMedia: string;
  selectedProgram: string;
  searchTerm: string;
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  isAddingNew: boolean;
  editingId: string | null;
  paginatedRates: T[];
  setSearchTerm: (term: string) => void;
  setSelectedMedia: (mediaId: string) => void;
  setSelectedProgram: (programId: string) => void;
  setCurrentPage: (page: number) => void;
  setIsAddingNew: (isAdding: boolean) => void;
  setEditingId: (id: string | null) => void;
  handleAddRate: (rateData: Omit<T, 'id' | 'created_at'>) => Promise<void>;
  handleEditRate: (id: string) => void;
  handleSaveEdit: (rateData: Omit<T, 'created_at'>) => Promise<void>;
  handleDeleteRate: (id: string) => Promise<void>;
  loadData: () => Promise<void>;
  totalRates: number;
}
