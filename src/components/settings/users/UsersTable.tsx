
import { UserProfile } from "@/services/users/userService";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Edit, Trash2, ArrowUpDown } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface UsersTableProps {
  users: UserProfile[];
  onEdit: (user: UserProfile) => void;
  onDelete: (id: string) => void;
  sortField: keyof UserProfile;
  sortOrder: "asc" | "desc";
  onSort: (field: keyof UserProfile) => void;
}

export function UsersTable({ 
  users, 
  onEdit, 
  onDelete,
  sortField,
  sortOrder,
  onSort
}: UsersTableProps) {
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy HH:mm");
    } catch (error) {
      return "Fecha inválida";
    }
  };

  const getSortIcon = (field: keyof UserProfile) => {
    if (sortField !== field) return <ArrowUpDown className="ml-2 h-4 w-4" />;
    return sortOrder === "asc" ? 
      <ArrowUpDown className="ml-2 h-4 w-4 text-primary" /> : 
      <ArrowUpDown className="ml-2 h-4 w-4 text-primary" />;
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead 
              className="cursor-pointer"
              onClick={() => onSort("username")}
            >
              <div className="flex items-center">
                Usuario {getSortIcon("username")}
              </div>
            </TableHead>
            <TableHead>Email</TableHead>
            <TableHead 
              className="cursor-pointer"
              onClick={() => onSort("role")}
            >
              <div className="flex items-center">
                Rol {getSortIcon("role")}
              </div>
            </TableHead>
            <TableHead
              className="cursor-pointer"
              onClick={() => onSort("created_at")}
            >
              <div className="flex items-center">
                Creado {getSortIcon("created_at")}
              </div>
            </TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">{user.username}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                <Badge variant={user.role === "administrator" ? "default" : "secondary"}>
                  {user.role === "administrator" ? "Administrador" : "Entrada de datos"}
                </Badge>
              </TableCell>
              <TableCell>{formatDate(user.created_at)}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(user)}
                  >
                    <Edit className="h-4 w-4" />
                    <span className="sr-only">Editar</span>
                  </Button>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700 hover:bg-red-100"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Eliminar</span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          ¿Estás seguro de eliminar este usuario?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta acción no se puede deshacer. El usuario {user.username} ({user.email}) será eliminado permanentemente.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-red-500 hover:bg-red-700"
                          onClick={() => onDelete(user.id)}
                        >
                          Eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
