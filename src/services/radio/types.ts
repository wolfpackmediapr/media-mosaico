
export enum MigrationStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  ROLLED_BACK = 'rolled_back'
}

export interface StationType {
  id: string;
  name: string;
  code?: string;
}

export interface ProgramType {
  id?: string;  // Make id optional for seed data
  name: string;
  station_id: string;
  start_time: string;
  end_time: string;
  days: string[];
  host?: string;
  created_at?: string;
}

export interface RadioMigration {
  id?: string;
  version: string;
  name: string;
  description?: string;
  applied_at: string;
  applied_by: string | null;
  status: MigrationStatus;
  rollback_info: any;
}

export interface RadioDataVersion {
  id: number;
  version: string;
  updated_at: string;
}

export interface RadioRateType {
  id: string;
  station_id: string;
  station_name?: string;
  program_id: string;
  program_name?: string;
  days: string[];
  start_time: string;
  end_time: string;
  rate_15s: number | null;
  rate_30s: number | null;
  rate_45s: number | null;
  rate_60s: number | null;
  created_at?: string;
  updated_at?: string;
}
