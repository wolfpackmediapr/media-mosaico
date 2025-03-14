
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Client, fetchClients, addClient, updateClient, deleteClient } from "@/services/clients/clientService";
import { ClientsList } from "./ClientsList";

export function ClientsContainer() {
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<keyof Client>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const queryClient = useQueryClient();

  // Fetch clients
  const { data: clients, isLoading, error } = useQuery({
    queryKey: ["clients"],
    queryFn: fetchClients
  });

  // Mutations
  const addMutation = useMutation({
    mutationFn: addClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Cliente agregado correctamente");
      setShowForm(false);
    },
    onError: (error) => {
      toast.error(`Error al agregar cliente: ${error.message}`);
    }
  });

  const updateMutation = useMutation({
    mutationFn: updateClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Cliente actualizado correctamente");
      setShowForm(false);
      setEditingClient(null);
    },
    onError: (error) => {
      toast.error(`Error al actualizar cliente: ${error.message}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Cliente eliminado correctamente");
    },
    onError: (error) => {
      toast.error(`Error al eliminar cliente: ${error.message}`);
    }
  });

  // Handlers
  const handleAddClient = (client: Client) => {
    addMutation.mutate(client);
  };

  const handleUpdateClient = (client: Client) => {
    updateMutation.mutate(client);
  };

  const handleDeleteClient = (id: string) => {
    deleteMutation.mutate(id);
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setShowForm(true);
  };

  const handleSort = (field: keyof Client) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingClient(null);
  };

  // Get unique categories for filter
  const categories = clients
    ? [...new Set(clients.map(client => client.category))]
    : [];

  // Filter and sort clients
  const filteredClients = clients
    ? clients
        .filter(client => {
          // Category filter
          if (filterCategory && client.category !== filterCategory) {
            return false;
          }
          
          // Search filter
          if (searchTerm && !client.name.toLowerCase().includes(searchTerm.toLowerCase())) {
            return false;
          }
          
          return true;
        })
        .sort((a, b) => {
          // Ensure the properties exist on the object
          const fieldA = a[sortField]?.toString().toLowerCase() || "";
          const fieldB = b[sortField]?.toString().toLowerCase() || "";
          
          if (sortOrder === "asc") {
            return fieldA.localeCompare(fieldB);
          } else {
            return fieldB.localeCompare(fieldA);
          }
        })
    : [];

  // Check if we have filters applied
  const hasFilters = !!filterCategory || !!searchTerm;

  return (
    <ClientsList
      clients={filteredClients}
      allClients={clients || []}
      categories={categories}
      isLoading={isLoading}
      error={error as Error | null}
      showForm={showForm}
      setShowForm={setShowForm}
      editingClient={editingClient}
      filterCategory={filterCategory}
      setFilterCategory={setFilterCategory}
      searchTerm={searchTerm}
      setSearchTerm={setSearchTerm}
      sortField={sortField}
      sortOrder={sortOrder}
      hasFilters={hasFilters}
      onAddClient={handleAddClient}
      onUpdateClient={handleUpdateClient}
      onDeleteClient={handleDeleteClient}
      onEditClient={handleEdit}
      onSort={handleSort}
      onCancelForm={cancelForm}
    />
  );
}
