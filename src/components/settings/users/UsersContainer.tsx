
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { fetchUsers, UserProfile, createUser, updateUserProfile, deleteUser } from "@/services/users/userService";
import { UsersList } from "./UsersList";

export function UsersContainer() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<keyof UserProfile>("username");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [filterRole, setFilterRole] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    // Apply filters and sorting
    let filteredUsers = [...allUsers];

    // Apply role filter
    if (filterRole) {
      filteredUsers = filteredUsers.filter(user => user.role === filterRole);
    }

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filteredUsers = filteredUsers.filter(
        user => 
          user.username.toLowerCase().includes(searchLower) ||
          (user.email && user.email.toLowerCase().includes(searchLower))
      );
    }

    // Apply sorting
    filteredUsers.sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];
      
      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    setUsers(filteredUsers);
  }, [allUsers, filterRole, searchTerm, sortField, sortOrder]);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await fetchUsers();
      if (error) throw new Error(error.message);
      
      if (data) {
        setAllUsers(data);
        setUsers(data);
      }
    } catch (err: any) {
      setError(err);
      toast({
        variant: "destructive",
        title: "Error al cargar usuarios",
        description: err.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddUser = async (user: { email: string; password: string; username: string; role: "administrator" | "data_entry" }) => {
    try {
      const { error } = await createUser(user.email, user.password, user.username, user.role);
      if (error) throw new Error(error.message);
      
      toast({
        title: "Usuario creado",
        description: "El usuario ha sido creado exitosamente.",
      });
      
      // Reload users to show the new one
      loadUsers();
      setShowForm(false);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error al crear usuario",
        description: err.message,
      });
    }
  };

  const handleUpdateUser = async (user: UserProfile) => {
    try {
      const { error } = await updateUserProfile(user.id, {
        username: user.username, 
        role: user.role
      });
      
      if (error) throw new Error(error.message);
      
      toast({
        title: "Usuario actualizado",
        description: "El usuario ha sido actualizado exitosamente.",
      });
      
      // Update local state
      setAllUsers(allUsers.map(u => u.id === user.id ? user : u));
      setEditingUser(null);
      setShowForm(false);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error al actualizar usuario",
        description: err.message,
      });
    }
  };

  const handleDeleteUser = async (id: string) => {
    try {
      const { error } = await deleteUser(id);
      if (error) throw new Error(error.message);
      
      toast({
        title: "Usuario eliminado",
        description: "El usuario ha sido eliminado exitosamente.",
      });
      
      // Update local state
      setAllUsers(allUsers.filter(user => user.id !== id));
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error al eliminar usuario",
        description: err.message,
      });
    }
  };

  const handleEditUser = (user: UserProfile) => {
    setEditingUser(user);
    setShowForm(true);
  };

  const handleSort = (field: keyof UserProfile) => {
    if (field === sortField) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const handleCancelForm = () => {
    setEditingUser(null);
    setShowForm(false);
  };

  return (
    <UsersList
      users={users}
      allUsers={allUsers}
      roles={["administrator", "data_entry"]}
      isLoading={isLoading}
      error={error}
      showForm={showForm}
      setShowForm={setShowForm}
      editingUser={editingUser}
      filterRole={filterRole}
      setFilterRole={setFilterRole}
      searchTerm={searchTerm}
      setSearchTerm={setSearchTerm}
      sortField={sortField}
      sortOrder={sortOrder}
      hasFilters={!!filterRole || !!searchTerm}
      onAddUser={handleAddUser}
      onUpdateUser={handleUpdateUser}
      onDeleteUser={handleDeleteUser}
      onEditUser={handleEditUser}
      onSort={handleSort}
      onCancelForm={handleCancelForm}
    />
  );
}
