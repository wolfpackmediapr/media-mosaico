
export interface AudioMetadata {
  title?: string;
  artist?: string;
  album?: string;
  artwork?: {
    src: string;
    sizes?: string;
    type?: string;
  }[];
  duration?: number;
  emisora?: string;
  programa?: string;
  horario?: string;
  categoria?: string;
  station_id?: string;
  program_id?: string;
}
