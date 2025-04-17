import { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Mic, Speaker } from "lucide-react";

interface FormattedTranscriptionEditorProps {
  text: string;
  isEditing: boolean;
  isProcessing: boolean;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onClick?: () => void;
}

export default function FormattedTranscriptionEditor({
  text,
  isEditing,
  isProcessing,
  onChange,
  onClick,
}: FormattedTranscriptionEditorProps) {
  const [editableText, setEditableText] = useState(text);

  useEffect(() => {
    setEditableText(text);
  }, [text]);

  // Try to create sections based on simple speaker/marker-style splitting
  // E.g., split by lines starting with SPEAKER, ANUNCIO, etc.
  const sections = editableText.split(/(\n(?=\s*(SPEAKER [A-Z]+:|ANUNCIO:|PROGRAMA:))|\n{2,})/g)
    .map(part => part?.trim())
    .filter(Boolean);

  // We'll use an icon if the section seems like an "ad"/announcement or a regular segment/speaker
  function getSectionIcon(section: string) {
    if (/anuncio|publicidad/i.test(section)) return <Mic className="h-5 w-5 text-yellow-700" />;
    if (/speaker|participante|invitado/i.test(section)) return <Speaker className="h-5 w-5 text-blue-700" />;
    return <Speaker className="h-5 w-5 text-blue-400" />;
  }

  const handleSectionChange = (idx: number, e: React.ChangeEvent<HTMLTextAreaElement>) => {
    // Update just this section's text and recompose the entire transcript
    const newSections = [...sections];
    newSections[idx] = e.target.value;
    const updated = newSections.join("\n\n"); // Use double newlines so autosave triggers as usual
    setEditableText(updated);
    // Fire the main callback so everything (autosave, etc) keeps working
    onChange({
      ...e,
      target: {
        ...e.target,
        value: updated
      },
    });
  };

  return (
    <div className="space-y-4">
      {sections.map((section, idx) => (
        <div
          key={idx}
          className={`rounded-lg border p-2 mb-2 bg-blue-50 dark:bg-blue-900/10`}
        >
          <div className="flex items-center gap-2 mb-1 text-md font-semibold">
            {getSectionIcon(section)}
            <span className="text-blue-700 dark:text-blue-200">
              {section.slice(0, 40).split("\n")[0]}
            </span>
          </div>
          <Textarea
            value={section}
            onChange={e => handleSectionChange(idx, e)}
            readOnly={isProcessing || !isEditing}
            className="min-h-[60px] bg-transparent text-foreground"
            onClick={onClick}
            spellCheck
            autoCorrect="on"
          />
        </div>
      ))}
    </div>
  );
}
