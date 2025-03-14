
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { UsersTable } from "./UsersTable";
import { UserForm } from "./UserForm";
import { UserFilter } from "./UserFilter";
import { UserEmptyState } from "./UserEmptyState";
import { UserLoadingState } from "./UserLoadingState";
import { UserProfile } from "@/services/users/userService";

interface UsersListProps {
  users: UserProfile[];
  allUsers: UserProfile[];
  roles: string[];
  isLoading: boolean;
  error: Error | null;
  showForm: boolean;
  setShowForm: (show: boolean) => void;
  editingUser: UserProfile | null;
  filterRole: string | null;
  setFilterRole: (role: string | null) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  sortField: keyof UserProfile;
  sortOrder: "asc" | "desc";
  hasFilters: boolean;
  onAddUser: (user: any) => void;
  onUpdateUser: (user: UserProfile) => void;
  onDeleteUser: (id: string) => void;
  onEditUser: (user: UserProfile) => void;
  onSort: (field: keyof UserProfile) => void;
  onCancelForm: () => void;
}

export function UsersList({
  users,
  allUsers,
  roles,
  isLoading,
  error,
  showForm,
  setShowForm,
  editingUser,
  filterRole,
  setFilterRole,
  searchTerm,
  setSearchTerm,
  sortField,
  sortOrder,
  hasFilters,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  onEditUser,
  onSort,
  onCancelForm
}: UsersListProps) {
  return (
    <>
      <CardHeader>
        <CardTitle>Gestión de Usuarios</CardTitle>
        <CardDescription>
          Administra los usuarios del sistema y sus roles
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <UserFilter 
            roles={roles} 
            selectedRole={filterRole} 
            onRoleChange={setFilterRole}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
          />
          
          <Button 
            onClick={() => setShowForm(true)} 
            className="sm:w-auto"
            disabled={showForm}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Usuario
          </Button>
        </div>
        
        {/* Form */}
        {showForm && (
          <UserForm 
            user={editingUser} 
            onSubmit={editingUser ? onUpdateUser : onAddUser} 
            onCancel={onCancelForm}
            isEditing={!!editingUser}
          />
        )}
        
        {/* Table */}
        {isLoading ? (
          <UserLoadingState />
        ) : error ? (
          <div className="text-center py-8 text-red-500">
            Error al cargar usuarios: {error.message}
          </div>
        ) : users.length > 0 ? (
          <UsersTable 
            users={users} 
            onEdit={onEditUser} 
            onDelete={onDeleteUser}
            sortField={sortField}
            sortOrder={sortOrder}
            onSort={onSort}
          />
        ) : allUsers.length > 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No se encontraron usuarios con los filtros actuales.
          </div>
        ) : (
          <UserEmptyState 
            hasFilter={hasFilters}
            onAddUser={() => setShowForm(true)} 
          />
        )}
      </CardContent>

      <CardFooter>
        <p className="text-xs text-muted-foreground">
          Los usuarios con rol Administrador pueden modificar toda la información del sistema.
        </p>
      </CardFooter>
    </>
  );
}
