
export * from "./AnalysisSection";
export * from "./LeftSection";
export * from "./RightSection";
export * from "./TopSection";
export * from "./TranscriptionSection";
export * from "./NewsSegmentsSection";

// Import and then export NotePadSection (it doesn't use default exports)
import NotePadSection from "./NotePadSection";
export { NotePadSection };
