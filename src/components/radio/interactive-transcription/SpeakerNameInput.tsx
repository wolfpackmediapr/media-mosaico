
import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Check, X, Edit2 } from 'lucide-react';

interface SpeakerNameInputProps {
  originalSpeaker: string;
  customName: string;
  defaultName: string;
  onSave: (name: string) => void;
  isSaving?: boolean;
}

const SpeakerNameInput: React.FC<SpeakerNameInputProps> = ({
  originalSpeaker,
  customName,
  defaultName,
  onSave,
  isSaving = false
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(customName || defaultName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInputValue(customName || defaultName);
  }, [customName, defaultName]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    const trimmedValue = inputValue.trim();
    if (trimmedValue !== defaultName) {
      onSave(trimmedValue);
    } else {
      onSave(''); // Clear custom name if it's the same as default
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setInputValue(customName || defaultName);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const displayName = customName || defaultName;

  if (isEditing) {
    return (
      <div className="flex items-center gap-1 min-w-0 flex-1">
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          className="h-6 text-xs border-primary"
          disabled={isSaving}
        />
        <Button
          size="sm"
          variant="ghost"
          onClick={handleSave}
          disabled={isSaving}
          className="h-6 w-6 p-0"
        >
          <Check className="h-3 w-3" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleCancel}
          disabled={isSaving}
          className="h-6 w-6 p-0"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 min-w-0 flex-1 group">
      <span className="text-xs flex-1 min-w-0 truncate">
        {displayName}
        {customName && (
          <span className="text-muted-foreground ml-1">(custom)</span>
        )}
      </span>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setIsEditing(true)}
        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Edit2 className="h-3 w-3" />
      </Button>
    </div>
  );
};

export default SpeakerNameInput;
