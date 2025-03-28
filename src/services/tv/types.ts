
// Types for TV channels and programs
export interface ChannelType {
  id: string;
  name: string;
  code: string;
  created_at?: string;
}

export interface ProgramType {
  id: string;
  name: string;
  channel_id: string;
  start_time: string;
  end_time: string;
  days: string[];
  created_at?: string;
}

// New migration related types
export enum MigrationStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  ROLLED_BACK = 'rolled_back'
}

export interface TVMigration {
  id: string;
  version: string;
  name: string;
  description?: string;
  applied_at: string;
  applied_by?: string | null;
  status: string;
  rollback_info?: any | null;
}
