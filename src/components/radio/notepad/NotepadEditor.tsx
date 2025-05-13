
import React, { useRef, useEffect, useState } from "react";
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
  const [isFocused, setIsFocused] = useState(false);

  // Initialize editor content when component mounts or content changes externally
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== content) {
      editorRef.current.innerHTML = content || "";
    }
  }, [content]);

  // Handle input changes with improved event handling
  const handleInput = () => {
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML;
      onContentChange(newContent);
    }
  };

  return (
    <Card className="w-full">
      <NotepadToolbar />
      <CardContent className="p-0">
        <div
          ref={editorRef}
          contentEditable="true"
          className={`
            outline-none p-4 notepad-editor prose prose-sm max-w-none w-full focus:ring-0
            ${!content && !isFocused ? 'before:content-[attr(data-placeholder)] before:text-muted-foreground before:opacity-70' : ''}
          `}
          onInput={handleInput}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={{ minHeight }}
          data-placeholder={placeholder}
        />
      </CardContent>
    </Card>
  );
};

export default NotepadEditor;
