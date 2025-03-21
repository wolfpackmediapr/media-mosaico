
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
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  const queryClient = useQueryClient();

  // Fetch clients with pagination
  const { data, isLoading, error } = useQuery({
    queryKey: ["clients", currentPage, pageSize, sortField, sortOrder],
    queryFn: () => fetchClients(currentPage, pageSize, sortField, sortOrder)
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
    setCurrentPage(1); // Reset to first page when sorting changes
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingClient(null);
  };

  // Get unique categories for filter
  const categories = data?.data
    ? [...new Set(data.data.map(client => client.category))]
    : [];

  // Calculate total pages
  const totalPages = data?.totalCount
    ? Math.ceil(data.totalCount / pageSize)
    : 1;

  // Filter and sort clients (server handles most of this now)
  const filteredClients = data?.data
    ? data.data
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
    : [];

  // Check if we have filters applied
  const hasFilters = !!filterCategory || !!searchTerm;

  return (
    <ClientsList
      clients={filteredClients}
      allClients={data?.data || []}
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
      currentPage={currentPage}
      totalPages={totalPages}
      onPageChange={handlePageChange}
      onAddClient={handleAddClient}
      onUpdateClient={handleUpdateClient}
      onDeleteClient={handleDeleteClient}
      onEditClient={handleEdit}
      onSort={handleSort}
      onCancelForm={cancelForm}
    />
  );
}
