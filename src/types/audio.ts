
export interface AudioMetadata {
  title?: string;
  artist?: string;
  album?: string;
  year?: string;
  genre?: string;
  emisora?: string;
  programa?: string;
  horario?: string;
  categoria?: string;
  station_id?: string;
  program_id?: string;
  duration?: number;
  format?: string;
  bitrate?: number;
  channels?: number;
  sampleRate?: number;
}

export interface TranscriptionResult {
  id: string;
  text: string;
  status: string;
  error?: string;
  metadata?: AudioMetadata;
}

export interface TranscriptionSegment {
  id: string;
  start: number;
  end: number;
  text: string;
  speaker?: string;
  confidence?: number;
}

export interface SpeakerSegment {
  id: string;
  speaker: string;
  text: string;
  start: number;
  end: number;
  confidence?: number;
}
