
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
