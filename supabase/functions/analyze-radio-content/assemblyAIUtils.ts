
export const fetchTranscriptMetadata = async (
  transcriptId: string,
  assemblyKey: string
) => {
  let additionalContext = '';
  let hasSpeakerLabels = false;

  try {
    console.log('Fetching additional transcript metadata from AssemblyAI');
    
    // Fetch sentences data
    const sentencesResponse = await fetch(
      `https://api.assemblyai.com/v2/transcript/${transcriptId}/sentences`,
      {
        headers: {
          'Authorization': assemblyKey,
        },
      }
    );
    
    if (sentencesResponse.ok) {
      const sentencesData = await sentencesResponse.json();
      if (sentencesData.sentences?.length > 0) {
        additionalContext = `\nLa transcripción tiene ${sentencesData.sentences.length} oraciones con timestamps precisos.`;
      }
    }
    
    // Check for speaker labels (utterances)
    const utterancesResponse = await fetch(
      `https://api.assemblyai.com/v2/transcript/${transcriptId}/utterances`,
      {
        headers: {
          'Authorization': assemblyKey,
        },
      }
    );
    
    if (utterancesResponse.ok) {
      const utterancesData = await utterancesResponse.json();
      if (utterancesData.utterances?.length > 0) {
        hasSpeakerLabels = true;
        const speakerCount = new Set(utterancesData.utterances.map((u: any) => u.speaker)).size;
        additionalContext += `\nLa transcripción incluye etiquetas de ${speakerCount} hablantes distintos.`;
      }
    }
  } catch (error) {
    console.error('Error fetching additional metadata:', error);
  }

  return { additionalContext, hasSpeakerLabels };
};
