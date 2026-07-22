import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TagsInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  id?: string;
  className?: string;
}

export interface TagsInputHandle {
  /** Commit any pending text in the input as tags, returning the resulting list. */
  commit: () => string[];
}

export const TagsInput = React.forwardRef<TagsInputHandle, TagsInputProps>(
  ({ value, onChange, placeholder, id, className }, ref) => {
    const [draft, setDraft] = React.useState("");
    const inputRef = React.useRef<HTMLInputElement>(null);
    const valueRef = React.useRef<string[]>(value);
    React.useEffect(() => { valueRef.current = value; }, [value]);
    const [editingIdx, setEditingIdx] = React.useState<number | null>(null);
    const [editDraft, setEditDraft] = React.useState("");
    const editInputRef = React.useRef<HTMLInputElement>(null);
    React.useEffect(() => {
      if (editingIdx !== null) editInputRef.current?.focus();
    }, [editingIdx]);

    const computeMerged = (raw: string, base: string[] = valueRef.current): string[] => {
      const parts = raw
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);
      if (parts.length === 0) return base;
      const existingLower = new Set(base.map((t) => t.toLowerCase()));
      const next = [...base];
      for (const p of parts) {
        const key = p.toLowerCase();
        if (existingLower.has(key)) continue;
        existingLower.add(key);
        next.push(p);
      }
      return next;
    };

    const addTags = (raw: string) => {
      const next = computeMerged(raw);
      if (next.length !== valueRef.current.length) {
        valueRef.current = next;
        onChange(next);
      }
    };

    const commitDraft = () => {
      // Read directly from the DOM input to avoid losing characters typed
      // between the last React state update and the keydown/blur event.
      const raw = inputRef.current?.value ?? draft;
      if (raw.trim()) addTags(raw);
      if (inputRef.current) inputRef.current.value = "";
      setDraft("");
    };

    React.useImperativeHandle(ref, () => ({
      commit: () => {
        const raw = inputRef.current?.value ?? draft;
        if (!raw.trim()) return valueRef.current;
        const next = computeMerged(raw);
        if (next.length !== valueRef.current.length) {
          valueRef.current = next;
          onChange(next);
        }
        if (inputRef.current) inputRef.current.value = "";
        setDraft("");
        return next;
      },
    }), [draft, onChange]);

    const removeTag = (idx: number) => {
      const next = value.filter((_, i) => i !== idx);
      valueRef.current = next;
      onChange(next);
    };

    const startEdit = (idx: number) => {
      setEditingIdx(idx);
      setEditDraft(value[idx] ?? "");
    };

    const commitEdit = () => {
      if (editingIdx === null) return;
      const trimmed = editDraft.trim();
      const idx = editingIdx;
      setEditingIdx(null);
      setEditDraft("");
      if (!trimmed) {
        removeTag(idx);
        return;
      }
      // Case-insensitive dedupe against other tags.
      const key = trimmed.toLowerCase();
      const collides = value.some((t, i) => i !== idx && t.toLowerCase() === key);
      let next: string[];
      if (collides) {
        next = value.filter((_, i) => i !== idx);
      } else {
        next = value.map((t, i) => (i === idx ? trimmed : t));
      }
      valueRef.current = next;
      onChange(next);
    };

    const cancelEdit = () => {
      setEditingIdx(null);
      setEditDraft("");
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "," || e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
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
      <div className={cn("w-full", className)}>
        <div
          onClick={() => inputRef.current?.focus()}
          className="flex min-h-[80px] w-full flex-wrap gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 cursor-text"
        >
          {value.map((tag, idx) => (
            editingIdx === idx ? (
              <input
                key={`edit-${idx}`}
                ref={editInputRef}
                value={editDraft}
                onChange={(e) => setEditDraft(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    e.stopPropagation();
                    commitEdit();
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    e.stopPropagation();
                    cancelEdit();
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground outline-none ring-1 ring-ring"
                style={{ width: `${Math.max(4, editDraft.length + 1)}ch` }}
              />
            ) : (
              <span
                key={`${tag}-${idx}`}
                className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    startEdit(idx);
                  }}
                  title="Editar palabra clave"
                  className="cursor-text hover:underline focus:outline-none focus:ring-1 focus:ring-ring rounded-sm"
                >
                  {tag}
                </button>
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
            )
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
        <div className="mt-1 text-xs text-muted-foreground">
          <span>Presiona coma o Enter después de cada palabra clave. Haz clic en una etiqueta para editarla.</span>
        </div>
      </div>
    );
  }
);
TagsInput.displayName = "TagsInput";