
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Client, fetchClients, addClient, updateClient, deleteClient, setClientActive } from "@/services/clients/clientService";
import { ClientsList } from "./ClientsList";

export function ClientsContainer() {
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<"active" | "inactive" | "all">("active");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<keyof Client>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  // Debounce the search term so we don't fire a query on every keystroke.
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 350);
    return () => clearTimeout(t);
  }, [searchTerm]);
  // Reset to page 1 whenever a filter changes.
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, filterCategory, filterStatus]);

  const queryClient = useQueryClient();

  // Fetch clients with pagination
  const { data, isLoading, error } = useQuery({
    queryKey: ["clients", currentPage, pageSize, sortField, sortOrder, debouncedSearch, filterCategory, filterStatus],
    queryFn: () =>
      fetchClients({
        page: currentPage,
        pageSize,
        orderField: sortField as string,
        orderDirection: sortOrder,
        search: debouncedSearch,
        category: filterCategory,
        status: filterStatus,
      }),
  });

  // Mutations
  const addMutation = useMutation({
    mutationFn: addClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["client-spotlight"] });
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
      queryClient.invalidateQueries({ queryKey: ["client-spotlight"] });
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
      queryClient.invalidateQueries({ queryKey: ["client-spotlight"] });
      toast.success("Cliente eliminado correctamente");
    },
    onError: (error) => {
      toast.error(`Error al eliminar cliente: ${error.message}`);
    }
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      setClientActive(id, isActive),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["client-spotlight"] });
      toast.success(vars.isActive ? "Cliente activado" : "Cliente desactivado");
    },
    onError: (error: any) => {
      toast.error(`Error al actualizar estado: ${error.message}`);
    }
  });

  const handleToggleActive = (client: Client, isActive: boolean) => {
    if (!client.id) return;
    toggleActiveMutation.mutate({ id: client.id, isActive });
  };

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
  const categories: string[] = data?.data
    ? Array.from(new Set(data.data.map((client) => client.category).filter(Boolean) as string[]))
    : [];

  // Calculate total pages
  const totalPages = data?.totalCount
    ? Math.ceil(data.totalCount / pageSize)
    : 1;

  // Filtering, search, and status are all handled server-side now.
  const filteredClients = data?.data ?? [];

  // Check if we have filters applied
  const hasFilters = !!filterCategory || !!searchTerm || filterStatus !== "active";

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
      filterStatus={filterStatus}
      setFilterStatus={setFilterStatus}
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
      onToggleActiveClient={handleToggleActive}
      onSort={handleSort}
      onCancelForm={cancelForm}
    />
  );
}
