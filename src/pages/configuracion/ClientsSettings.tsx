
import { useState, useEffect } from "react";
import { SettingsLayout } from "@/components/settings/SettingsLayout";
import { CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ClientsTable } from "@/components/settings/clients/ClientsTable";
import { ClientForm } from "@/components/settings/clients/ClientForm";
import { ClientFilter } from "@/components/settings/clients/ClientFilter";
import { ClientEmptyState } from "@/components/settings/clients/ClientEmptyState";
import { ClientLoadingState } from "@/components/settings/clients/ClientLoadingState";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Client, fetchClients, addClient, updateClient, deleteClient } from "@/services/clients/clientService";

export default function ClientsSettings() {
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

  // Get unique categories for filter
  const categories = clients
    ? [...new Set(clients.map(client => client.category))]
    : [];

  // Check if we have filters applied
  const hasFilters = !!filterCategory || !!searchTerm;

  return (
    <SettingsLayout
      title="Clientes"
      description="Administra los clientes del sistema"
    >
      <CardHeader>
        <CardTitle>Gestión de Clientes</CardTitle>
        <CardDescription>
          Administra los clientes y sus palabras clave para el monitoreo de medios
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <ClientFilter 
            categories={categories} 
            selectedCategory={filterCategory} 
            onCategoryChange={setFilterCategory}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
          />
          
          <Button 
            onClick={() => setShowForm(true)} 
            className="sm:w-auto"
            disabled={showForm}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Cliente
          </Button>
        </div>
        
        {/* Form */}
        {showForm && (
          <ClientForm 
            client={editingClient} 
            onSubmit={editingClient ? handleUpdateClient : handleAddClient} 
            onCancel={cancelForm}
            isEditing={!!editingClient}
          />
        )}
        
        {/* Table */}
        {isLoading ? (
          <ClientLoadingState />
        ) : error ? (
          <div className="text-center py-8 text-red-500">
            Error al cargar clientes: {(error as Error).message}
          </div>
        ) : filteredClients.length > 0 ? (
          <ClientsTable 
            clients={filteredClients} 
            onEdit={handleEdit} 
            onDelete={handleDeleteClient}
            sortField={sortField}
            sortOrder={sortOrder}
            onSort={handleSort}
          />
        ) : clients?.length > 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No se encontraron clientes con los filtros actuales.
          </div>
        ) : (
          <ClientEmptyState 
            hasFilter={hasFilters}
            onAddClient={() => setShowForm(true)} 
          />
        )}
      </CardContent>

      <CardFooter>
        <p className="text-xs text-muted-foreground">
          Los clientes se utilizan para categorizar el contenido y enviar alertas relevantes.
        </p>
      </CardFooter>
    </SettingsLayout>
  );
}
