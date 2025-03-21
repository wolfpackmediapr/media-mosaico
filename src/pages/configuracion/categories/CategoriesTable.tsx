
import React from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { Category } from "./types";

interface CategoriesTableProps {
  categories: Category[];
  onEdit: (category: Category) => void;
  onDelete: (id: string) => void;
}

export function CategoriesTable({ categories, onEdit, onDelete }: CategoriesTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[40%]">CATEGORIA</TableHead>
          <TableHead className="w-[40%]">CATEGORIA EN INGLES</TableHead>
          <TableHead className="w-[20%] text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {categories.map((category) => (
          <TableRow key={category.id}>
            <TableCell className="font-medium">{category.name_es}</TableCell>
            <TableCell>{category.name_en || "-"}</TableCell>
            <TableCell className="text-right">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => onEdit(category)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => onDelete(category.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
