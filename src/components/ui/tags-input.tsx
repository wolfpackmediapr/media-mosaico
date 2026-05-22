import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TagsInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  maxLength?: number;
  id?: string;
  className?: string;
}

export const TagsInput = React.forwardRef<HTMLDivElement, TagsInputProps>(
  ({ value, onChange, placeholder, maxLength = 500, id, className }, ref) => {
    const [draft, setDraft] = React.useState("");
    const inputRef = React.useRef<HTMLInputElement>(null);

    const totalChars = value.join(",").length + draft.length;

    const addTags = (raw: string) => {
      const parts = raw
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);
      if (parts.length === 0) return;
      const existingLower = new Set(value.map((t) => t.toLowerCase()));
      const next = [...value];
      for (const p of parts) {
        const key = p.toLowerCase();
        if (existingLower.has(key)) continue;
        existingLower.add(key);
        next.push(p);
      }
      if (next.length !== value.length) onChange(next);
    };

    const commitDraft = () => {
      if (draft.trim()) addTags(draft);
      setDraft("");
    };

    const removeTag = (idx: number) => {
      onChange(value.filter((_, i) => i !== idx));
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "," || e.key === "Enter") {
        e.preventDefault();
        commitDraft();
      } else if (e.key === "Backspace" && draft === "" && value.length > 0) {
        e.preventDefault();
        removeTag(value.length - 1);
      }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
      const text = e.clipboardData.getData("text");
      if (text.includes(",")) {
        e.preventDefault();
        addTags(text);
        setDraft("");
      }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      if (v.endsWith(",")) {
        addTags(v.slice(0, -1));
        setDraft("");
        return;
      }
      setDraft(v);
    };

    return (
      <div ref={ref} className={cn("w-full", className)}>
        <div
          onClick={() => inputRef.current?.focus()}
          className="flex min-h-[80px] w-full flex-wrap gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 cursor-text"
        >
          {value.map((tag, idx) => (
            <span
              key={`${tag}-${idx}`}
              className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
            >
              {tag}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeTag(idx);
                }}
                aria-label={`Eliminar ${tag}`}
                className="rounded-sm hover:bg-muted-foreground/20 focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <input
            ref={inputRef}
            id={id}
            value={draft}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onBlur={commitDraft}
            placeholder={value.length === 0 ? placeholder : ""}
            className="flex-1 min-w-[120px] bg-transparent outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
          <span>Presiona coma o Enter después de cada palabra clave</span>
          <span>
            {totalChars}/{maxLength}
          </span>
        </div>
      </div>
    );
  }
);
TagsInput.displayName = "TagsInput";