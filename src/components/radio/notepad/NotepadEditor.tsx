
import React, { useRef, useEffect, useState } from "react";
import DOMPurify from "dompurify";
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

  const sanitizeOptions = {
    ALLOWED_TAGS: ['b', 'i', 'u', 'strong', 'em', 'p', 'br', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'div', 'span'],
    ALLOWED_ATTR: [] as string[],
    KEEP_CONTENT: true
  };

  // Initialize editor content when component mounts or content changes externally
  useEffect(() => {
    if (editorRef.current) {
      const sanitized = DOMPurify.sanitize(content || "", sanitizeOptions);
      if (editorRef.current.innerHTML !== sanitized) {
        editorRef.current.innerHTML = sanitized;
      }
    }
  }, [content]);

  // Handle input changes with sanitization
  const handleInput = () => {
    if (editorRef.current) {
      const rawContent = editorRef.current.innerHTML;
      const sanitized = DOMPurify.sanitize(rawContent, sanitizeOptions);
      onContentChange(sanitized);
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
