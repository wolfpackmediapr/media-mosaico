import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  Brain, 
  Lightbulb, 
  Heart, 
  FileText, 
  ShieldAlert, 
  Tag 
} from "lucide-react";
import { TranscriptionAnalysis } from "@/types/assemblyai";

interface AnalysisAccordionProps {
  analysis?: TranscriptionAnalysis;
}

const AnalysisAccordion = ({ analysis }: AnalysisAccordionProps) => {
  if (!analysis) return null;

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="entity-detection">
        <AccordionTrigger className="flex gap-2 text-primary-600 hover:text-primary-800">
          <Brain className="h-5 w-5" />
          <span>Entity Detection</span>
        </AccordionTrigger>
        <AccordionContent className="text-sm text-gray-600">
          {analysis.assembly_entities ? (
            <pre className="whitespace-pre-wrap">
              {JSON.stringify(analysis.assembly_entities, null, 2)}
            </pre>
          ) : (
            <p>No entity detection data available</p>
          )}
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="auto-highlights">
        <AccordionTrigger className="flex gap-2 text-primary-600 hover:text-primary-800">
          <Lightbulb className="h-5 w-5" />
          <span>Auto Highlights</span>
        </AccordionTrigger>
        <AccordionContent className="text-sm text-gray-600">
          {analysis.assembly_key_phrases ? (
            <pre className="whitespace-pre-wrap">
              {JSON.stringify(analysis.assembly_key_phrases, null, 2)}
            </pre>
          ) : (
            <p>No highlights data available</p>
          )}
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="sentiment">
        <AccordionTrigger className="flex gap-2 text-primary-600 hover:text-primary-800">
          <Heart className="h-5 w-5" />
          <span>Sentiment Analysis</span>
        </AccordionTrigger>
        <AccordionContent className="text-sm text-gray-600">
          {analysis.assembly_sentiment_analysis ? (
            <pre className="whitespace-pre-wrap">
              {JSON.stringify(analysis.assembly_sentiment_analysis, null, 2)}
            </pre>
          ) : (
            <p>No sentiment analysis data available</p>
          )}
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="summarization">
        <AccordionTrigger className="flex gap-2 text-primary-600 hover:text-primary-800">
          <FileText className="h-5 w-5" />
          <span>Summarization</span>
        </AccordionTrigger>
        <AccordionContent className="text-sm text-gray-600">
          {analysis.assembly_summary ? (
            <p className="whitespace-pre-wrap">{analysis.assembly_summary}</p>
          ) : (
            <p>No summary available</p>
          )}
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="content-safety">
        <AccordionTrigger className="flex gap-2 text-primary-600 hover:text-primary-800">
          <ShieldAlert className="h-5 w-5" />
          <span>Content Safety</span>
        </AccordionTrigger>
        <AccordionContent className="text-sm text-gray-600">
          {analysis.assembly_content_safety ? (
            <pre className="whitespace-pre-wrap">
              {JSON.stringify(analysis.assembly_content_safety, null, 2)}
            </pre>
          ) : (
            <p>No content safety data available</p>
          )}
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="topic-detection">
        <AccordionTrigger className="flex gap-2 text-primary-600 hover:text-primary-800">
          <Tag className="h-5 w-5" />
          <span>Topic Detection</span>
        </AccordionTrigger>
        <AccordionContent className="text-sm text-gray-600">
          {analysis.assembly_topics ? (
            <pre className="whitespace-pre-wrap">
              {JSON.stringify(analysis.assembly_topics, null, 2)}
            </pre>
          ) : (
            <p>No topic detection data available</p>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

export default AnalysisAccordion;