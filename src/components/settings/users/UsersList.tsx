
import { useState } from "react";
import { UserProfile } from "@/services/users/userService";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { UserForm } from "./UserForm";
import { UsersTable } from "./UsersTable";
import { UserFilter } from "./UserFilter";
import { UserLoadingState } from "./UserLoadingState";
import { UserEmptyState } from "./UserEmptyState";

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
  onAddUser: (user: any) => Promise<void>;
  onUpdateUser: (user: UserProfile) => Promise<void>;
  onDeleteUser: (id: string) => Promise<void>;
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
  onCancelForm,
}: UsersListProps) {
  const toggleForm = () => {
    setShowForm(!showForm);
  };

  const handleFormSubmit = async (user: any) => {
    if (editingUser) {
      await onUpdateUser(user);
    } else {
      await onAddUser(user);
    }
  };

  const clearFilters = () => {
    setFilterRole(null);
    setSearchTerm("");
  };

  // If there's an error, show it
  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-destructive mb-2">Error al cargar usuarios</p>
        <p className="text-muted-foreground">{error.message}</p>
        <Button onClick={() => window.location.reload()} className="mt-4">
          Intentar de nuevo
        </Button>
      </div>
    );
  }

  // Show loading state
  if (isLoading) {
    return <UserLoadingState />;
  }

  return (
    <div className="p-6">
      {!showForm && (
        <div className="flex flex-col space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Usuarios del sistema</h2>
            <Button onClick={toggleForm}>
              <Plus className="h-4 w-4 mr-2" />
              Agregar usuario
            </Button>
          </div>

          <UserFilter
            roles={roles}
            selectedRole={filterRole}
            onRoleChange={setFilterRole}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            onClearFilters={clearFilters}
          />

          {users.length === 0 ? (
            <UserEmptyState 
              hasFilter={hasFilters} 
              onAddUser={toggleForm} 
            />
          ) : (
            <UsersTable
              users={users}
              onDelete={onDeleteUser}
              onEdit={onEditUser}
              sortField={sortField}
              sortOrder={sortOrder}
              onSort={onSort}
            />
          )}
        </div>
      )}

      {showForm && (
        <UserForm
          onSubmit={handleFormSubmit}
          onCancel={onCancelForm}
          editingUser={editingUser}
          roles={roles}
        />
      )}
    </div>
  );
}
