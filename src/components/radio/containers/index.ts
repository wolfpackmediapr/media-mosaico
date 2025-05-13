
// Export each section with named export pattern
export { TopSection } from "./TopSection";
export { LeftSection } from "./LeftSection";
export { RightSection } from "./RightSection";
export { TranscriptionSection } from "./TranscriptionSection";
export { AnalysisSection } from "./AnalysisSection";
export { NewsSegmentsSection } from "./NewsSegmentsSection";
// Import and then re-export NotePadSection (uses default export)
import NotePadSection from "./NotePadSection.tsx";
export { NotePadSection };
