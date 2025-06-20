
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, X, Edit2 } from 'lucide-react';

interface SpeakerNameInputProps {
  originalSpeaker: string;
  displayName: string;
  hasCustomName: boolean;
  onSave: (originalSpeaker: string, customName: string) => Promise<void>;
  onDelete: (originalSpeaker: string) => Promise<void>;
  isInline?: boolean;
  className?: string;
}

const SpeakerNameInput: React.FC<SpeakerNameInputProps> = ({
  originalSpeaker,
  displayName,
  hasCustomName,
  onSave,
  onDelete,
  isInline = true,
  className = ''
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartEdit = () => {
    setInputValue(hasCustomName ? displayName : '');
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setInputValue('');
  };

  const handleSave = async () => {
    if (!inputValue.trim()) {
      handleCancel();
      return;
    }

    setIsSaving(true);
    try {
      await onSave(originalSpeaker, inputValue.trim());
      setIsEditing(false);
      setInputValue('');
    } catch (error) {
      console.error('Error saving speaker name:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsSaving(true);
    try {
      await onDelete(originalSpeaker);
      setIsEditing(false);
      setInputValue('');
    } catch (error) {
      console.error('Error deleting speaker name:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  if (isInline) {
    return (
      <div className={`inline-flex items-center gap-1 ${className}`}>
        {isEditing ? (
          <>
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-6 text-xs px-2 w-24"
              placeholder="Speaker name"
              disabled={isSaving}
            />
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
              onClick={handleSave}
              disabled={isSaving || !inputValue.trim()}
            >
              <Check className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
              onClick={handleCancel}
              disabled={isSaving}
            >
              <X className="h-3 w-3" />
            </Button>
            {hasCustomName && (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                onClick={handleDelete}
                disabled={isSaving}
                title="Reset to original name"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-xs font-medium hover:bg-gray-100"
            onClick={handleStartEdit}
            title={hasCustomName ? "Edit custom name" : "Add custom name"}
          >
            {displayName}
            <Edit2 className="h-3 w-3 ml-1 opacity-50" />
          </Button>
        )}
      </div>
    );
  }

  // Block layout for non-inline usage
  return (
    <div className={`space-y-2 ${className}`}>
      {isEditing ? (
        <div className="flex items-center gap-2">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter speaker name"
            disabled={isSaving}
          />
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving || !inputValue.trim()}
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCancel}
            disabled={isSaving}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="font-medium">{displayName}</span>
          <Button
            size="sm"
            variant="outline"
            onClick={handleStartEdit}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          {hasCustomName && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleDelete}
              disabled={isSaving}
            >
              Reset
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default SpeakerNameInput;
