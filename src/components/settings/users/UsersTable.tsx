
import { Button } from "@/components/ui/button";
import { UserProfile } from "@/services/users/userService";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Edit, MoreHorizontal, Trash2 } from "lucide-react";
import { useState } from "react";

interface UsersTableProps {
  users: UserProfile[];
  onDelete: (id: string) => void;
  onEdit: (user: UserProfile) => void;
  sortField: keyof UserProfile;
  sortOrder: "asc" | "desc";
  onSort: (field: keyof UserProfile) => void;
}

export function UsersTable({
  users,
  onDelete,
  onEdit,
  sortField,
  sortOrder,
  onSort,
}: UsersTableProps) {
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);

  const handleDeleteClick = (user: UserProfile) => {
    setUserToDelete(user);
  };

  const confirmDelete = () => {
    if (userToDelete) {
      onDelete(userToDelete.id);
      setUserToDelete(null);
    }
  };

  const cancelDelete = () => {
    setUserToDelete(null);
  };

  const getSortIcon = (field: keyof UserProfile) => {
    if (field !== sortField) return null;
    return sortOrder === "asc" ? "↑" : "↓";
  };

  const handleSortClick = (field: keyof UserProfile) => {
    onSort(field);
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead 
              className="cursor-pointer"
              onClick={() => handleSortClick("username")}
            >
              Nombre {getSortIcon("username")}
            </TableHead>
            <TableHead 
              className="cursor-pointer"
              onClick={() => handleSortClick("email")}
            >
              Correo {getSortIcon("email")}
            </TableHead>
            <TableHead 
              className="cursor-pointer"
              onClick={() => handleSortClick("role")}
            >
              Rol {getSortIcon("role")}
            </TableHead>
            <TableHead 
              className="cursor-pointer"
              onClick={() => handleSortClick("created_at")}
            >
              Creado {getSortIcon("created_at")}
            </TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>{user.username}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                {user.role === "administrator" ? "Administrador" : "Entrada de datos"}
              </TableCell>
              <TableCell>
                {new Date(user.created_at).toLocaleDateString()}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Abrir menú</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(user)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleDeleteClick(user)}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && cancelDelete()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente
              al usuario <strong>{userToDelete?.username}</strong> y todos sus datos asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
