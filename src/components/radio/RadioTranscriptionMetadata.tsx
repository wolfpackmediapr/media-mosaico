
import { RadioTranscriptionHeader } from './metadata/RadioTranscriptionHeader';

interface RadioTranscriptionMetadataProps {
  metadata?: {
    emisora?: string;
    programa?: string;
    horario?: string;
    categoria?: string;
    station_id?: string;
    program_id?: string;
  };
  onMetadataChange?: (metadata: {
    emisora: string;
    programa: string;
    horario: string;
    categoria: string;
    station_id: string;
    program_id: string;
  }) => void;
}

const RadioTranscriptionMetadata = (props: RadioTranscriptionMetadataProps) => {
  return <RadioTranscriptionHeader {...props} />;
};

export default RadioTranscriptionMetadata;
