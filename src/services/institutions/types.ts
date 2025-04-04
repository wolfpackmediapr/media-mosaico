
export interface InstitutionCategoryType {
  id: string;
  name: string;
  created_at?: string;
  updated_at?: string;
}

export interface InstitutionType {
  id: string;
  name: string;
  category_id: string;
  created_at?: string;
  updated_at?: string;
}

export interface AgencyType {
  id: string;
  name: string;
  created_at?: string;
  updated_at?: string;
}
