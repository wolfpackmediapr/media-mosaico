
import React from 'react';
import { Trash2, Layout } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';

interface FileOperationsProps {
  onRemoveFile: () => void;
  selectedLayout: string;
  onChangeLayout: (layout: string) => void;
}

const FileOperations: React.FC<FileOperationsProps> = ({
  onRemoveFile,
  selectedLayout,
  onChangeLayout
}) => {
  return (
    <div className="flex justify-between items-center">
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onRemoveFile}
          className="text-destructive"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Eliminar archivo
        </Button>
      </div>
      
      <div className="flex items-center gap-2">
        <Layout className="w-4 h-4 text-muted-foreground" />
        <Select 
          value={selectedLayout} 
          onValueChange={onChangeLayout}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Diseño" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="split">Vista dividida</SelectItem>
            <SelectItem value="full">Pantalla completa</SelectItem>
            <SelectItem value="compact">Compacto</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default FileOperations;
