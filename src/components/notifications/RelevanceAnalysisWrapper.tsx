
import React from "react";
import ClientRelevanceAnalysis from "./ClientRelevanceAnalysis";

interface RelevanceAnalysisWrapperProps {
  showRelevanceAnalysis: boolean;
  setShowRelevanceAnalysis: (value: boolean) => void;
  selectedClient: any;
}

const RelevanceAnalysisWrapper = ({
  showRelevanceAnalysis,
  setShowRelevanceAnalysis,
  selectedClient
}: RelevanceAnalysisWrapperProps) => {
  if (!showRelevanceAnalysis || !selectedClient) return null;
  
  return (
    <ClientRelevanceAnalysis
      clientId={selectedClient.id}
      clientName={selectedClient.name}
      onClose={() => setShowRelevanceAnalysis(false)}
    />
  );
};

export default RelevanceAnalysisWrapper;
