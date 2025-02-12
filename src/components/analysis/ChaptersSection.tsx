
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface ChaptersSectionProps {
  chapters?: {
    gist: string;
    headline: string;
    summary: string;
    start: number;
    end: number;
  }[];
  onChapterClick?: (start: number) => void;
}

const ChaptersSection = ({ chapters, onChapterClick }: ChaptersSectionProps) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!chapters || chapters.length === 0) return null;

  const formatTimestamp = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="mt-6">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xl font-bold">Chapters</CardTitle>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-9 p-0">
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {chapters.map((chapter, index) => (
              <div
                key={index}
                className="rounded-lg border p-4 hover:bg-accent cursor-pointer"
                onClick={() => onChapterClick?.(chapter.start)}
              >
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-semibold">{chapter.headline}</h4>
                  <span className="text-sm text-muted-foreground">
                    {formatTimestamp(chapter.start)} - {formatTimestamp(chapter.end)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{chapter.summary}</p>
              </div>
            ))}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default ChaptersSection;
