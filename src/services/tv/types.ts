export interface ChannelType {
  id: string;
  name: string;
  code: string;
}

export interface ProgramType {
  id: string;
  name: string;
  channel_id: string;
  start_time: string;
  end_time: string;
  days: string[];
}

export interface TvRateType {
  id: string;
  channel_id: string;
  program_id: string;
  days: string[];
  start_time: string;
  end_time: string;
  rate_15s: number | null;
  rate_30s: number | null;
  rate_45s: number | null;
  rate_60s: number | null;
  created_at?: string;
  channel_name?: string;
  program_name?: string;
}
