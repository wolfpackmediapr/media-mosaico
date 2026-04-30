
import { useEffect, useMemo, useState } from "react";
import TvTranscriptionSlot from "./TvTranscriptionSlot";
import { NewsSegment } from "@/hooks/use-video-processor";
import { TranscriptionResult } from "@/services/audio/transcriptionService";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { parseTvSpeakerText, hasTvSpeakerPatterns } from "@/utils/tv/speakerTextParser";
import { useTranscriptionPolling } from "@/hooks/tv/useTranscriptionPolling";
import { toast } from "sonner";

interface TvTranscriptionSectionProps {
  textContent: string;
  isProcessing: boolean;
  transcriptionMetadata?: {
    channel?: string;
    program?: string;
    category?: string;
    broadcastTime?: string;
  };
  transcriptionResult?: TranscriptionResult;
  transcriptionId?: string;
  segments?: NewsSegment[];
  notepadContent?: string;
  onTranscriptionChange: (text: string) => void;
  onSeekToTimestamp: (timestamp: number) => void;
  onSegmentsReceived?: (segments: NewsSegment[]) => void;
  registerEditorReset?: (fn: () => void) => void;
  isPlaying?: boolean;
  currentTime?: number;
  onPlayPause?: () => void;
}

const TvTranscriptionSection = ({
  textContent,
  isProcessing,
  transcriptionMetadata,
  transcriptionResult,
  transcriptionId,
  segments = [],
  notepadContent = "",
  onTranscriptionChange,
  onSeekToTimestamp,
  onSegmentsReceived,
  registerEditorReset,
  isPlaying = false,
  currentTime = 0,
  onPlayPause = () => {}
}: TvTranscriptionSectionProps) => {
  const [speakerIdStatus, setSpeakerIdStatus] = useState<string | null>(null);
  const [speakerIdError, setSpeakerIdError] = useState<string | null>(null);

  // Watch the analysis pipeline for this transcription. When the polling hook
  // gives up (10 min hard timeout with full_analysis still null), expose a
  // "Reintentar análisis" button that re-invokes analyze-tv-stored.
  const {
    analysisTimedOut,
    retryAnalysis,
    isRetryingAnalysis,
  } = useTranscriptionPolling(transcriptionId ?? null, !!transcriptionId);

  const handleRetryAnalysis = async () => {
    if (!transcriptionId) return;
    const result = await retryAnalysis(transcriptionId);
    if (result.ok) {
      toast.success("Reintentando análisis…");
    } else {
      toast.error(result.error || "No se pudo reintentar el análisis");
    }
  };

  // Compute speaker counts from utterances or parsed text
  const speakerCounts = useMemo(() => {
    const utterances =
      transcriptionResult?.utterances && transcriptionResult.utterances.length > 0
        ? transcriptionResult.utterances
        : hasTvSpeakerPatterns(textContent)
          ? parseTvSpeakerText(textContent)
          : [];

    if (!utterances.length) return null;

    const unique = new Set<string>();
    let identified = 0;
    utterances.forEach((u) => {
      const id = String(u.speaker);
      const head = id.split('|')[0];
      if (!unique.has(head)) {
        unique.add(head);
        if (id.includes('|') || /speaker_\w+_\(/i.test(id)) identified += 1;
      }
    });

    return { total: unique.size, identified };
  }, [transcriptionResult?.utterances, textContent]);

  useEffect(() => {
    if (!transcriptionId) {
      setSpeakerIdStatus(null);
      setSpeakerIdError(null);
      return;
    }
    let cancelled = false;
    (supabase as any)
      .from("tv_transcriptions")
      .select("speaker_id_status, speaker_id_error")
      .eq("id", transcriptionId)
      .maybeSingle()
      .then(({ data }: any) => {
        if (cancelled || !data) return;
        setSpeakerIdStatus(data.speaker_id_status ?? null);
        setSpeakerIdError(data.speaker_id_error ?? null);
      });
    return () => { cancelled = true; };
  }, [transcriptionId, textContent]);

  const renderSpeakerBadge = () => {
    if (!transcriptionId || !speakerIdStatus || speakerIdStatus === "pending") return null;
    if (speakerIdStatus === "success") {
      return (
        <Badge variant="secondary" className="gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Hablantes identificados
        </Badge>
      );
    }
    if (speakerIdStatus === "failed" || speakerIdStatus === "skipped") {
      return (
        <Badge
          variant="outline"
          className="gap-1 border-destructive/40 text-destructive"
          title={speakerIdError || undefined}
        >
          <AlertTriangle className="h-3 w-3" />
          Identificación de hablantes no disponible
        </Badge>
      );
    }
    return null;
  };

  const renderSpeakerCountBadge = () => {
    if (!speakerCounts) return null;
    return (
      <Badge variant="outline" className="gap-1">
        <Users className="h-3 w-3" />
        {speakerCounts.total} hablantes
        {speakerCounts.identified > 0 && ` · ${speakerCounts.identified} identificados`}
      </Badge>
    );
  };

  // Always render the transcription slot, regardless of text content
  return (
    <div className="space-y-2">
      {(isProcessing || renderSpeakerBadge() || speakerCounts || analysisTimedOut) && (
        <div className="flex items-center gap-2">
          {isProcessing && (
            <Badge variant="secondary" className="gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Procesando
            </Badge>
          )}
          {renderSpeakerBadge()}
          {renderSpeakerCountBadge()}
          {analysisTimedOut && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleRetryAnalysis}
              disabled={isRetryingAnalysis}
              className="h-7 gap-1 border-destructive/40 text-destructive hover:text-destructive"
            >
              {isRetryingAnalysis ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
              Reintentar análisis
            </Button>
          )}
        </div>
      )}
      <TvTranscriptionSlot
      isProcessing={isProcessing}
      transcriptionText={textContent}
      transcriptionResult={transcriptionResult}
      transcriptionId={transcriptionId}
      metadata={transcriptionMetadata || {
        channel: "WIPR",
        program: "Noticias Puerto Rico",
        category: "Economía",
        broadcastTime: "2024-03-15T10:00:00Z"
      }}
      segments={segments}
      notepadContent={notepadContent}
      onTranscriptionChange={onTranscriptionChange}
      onSegmentsReceived={onSegmentsReceived}
      onSeek={onSeekToTimestamp}
      registerEditorReset={registerEditorReset}
      isPlaying={isPlaying}
      currentTime={currentTime}
      onPlayPause={onPlayPause}
      />
    </div>
  );
};

export default TvTranscriptionSection;
