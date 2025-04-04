
export interface PressGenreType {
  id: string;
  name: string;
  created_at?: string;
  updated_at?: string;
}

export interface PressSectionType {
  id: string;
  name: string;
  created_at?: string;
  updated_at?: string;
}

export interface PressSourceType {
  id: string;
  name: string;
  created_at?: string;
  updated_at?: string;
}

export interface PressRateType {
  id: string;
  name: string;
  created_at?: string;
  updated_at?: string;
}

export interface SearchFilters {
  searchTerm: string;
}
