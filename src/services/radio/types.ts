
export enum MigrationStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  ROLLED_BACK = 'rolled_back'
}

export interface StationType {
  id: string;
  name: string;
  code: string;
}

export interface ProgramType {
  id?: string;
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
