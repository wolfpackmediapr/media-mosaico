
import React, { useRef, useEffect } from "react";
import NotepadToolbar from "./NotepadToolbar";
import { Card, CardContent } from "@/components/ui/card";

interface NotepadEditorProps {
  content: string;
  onContentChange: (content: string) => void;
  placeholder?: string;
  minHeight?: string;
}

const NotepadEditor = ({
  content,
  onContentChange,
  placeholder = "Write your notes here...",
  minHeight = "200px"
}: NotepadEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);

  // Initialize editor content when component mounts
  useEffect(() => {
    if (editorRef.current) {
      if (content) {
        editorRef.current.innerHTML = content;
      } else {
        editorRef.current.innerHTML = "";
      }
    }
  }, []);

  // Handle input changes
  const handleInput = () => {
    if (editorRef.current) {
      onContentChange(editorRef.current.innerHTML);
    }
  };

  return (
    <Card className="w-full">
      <NotepadToolbar />
      <CardContent className="p-0">
        <div
          ref={editorRef}
          contentEditable="true"
          className="outline-none p-4 notepad-editor prose prose-sm max-w-none w-full focus:ring-0"
          onInput={handleInput}
          style={{ minHeight }}
          dangerouslySetInnerHTML={{ __html: content }}
          data-placeholder={placeholder}
        />
      </CardContent>
    </Card>
  );
};

export default NotepadEditor;
