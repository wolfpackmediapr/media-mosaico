
import { useState, useEffect } from "react";
import { SettingsLayout } from "@/components/settings/SettingsLayout";
import { Button } from "@/components/ui/button";
import { CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { FileDown, Users } from "lucide-react";

// Import our components
import { ClientForm } from "@/components/settings/clients/ClientForm";
import { ClientsTable } from "@/components/settings/clients/ClientsTable";
import { ClientFilter } from "@/components/settings/clients/ClientFilter";
import { ClientLoadingState } from "@/components/settings/clients/ClientLoadingState";
import { ClientEmptyState } from "@/components/settings/clients/ClientEmptyState";

// Import the service
import { 
  Client, 
  fetchClients,
  addClient,
  updateClient,
  deleteClient
} from "@/services/clients/clientService";

export default function ClientsSettings() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<keyof Client>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [showFilter, setShowFilter] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Client | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    loadClients();
  }, [sortField, sortOrder, filterCategory]);

  const loadClients = async () => {
    setLoading(true);
    try {
      const data = await fetchClients(sortField, sortOrder, filterCategory);
      setClients(data);
    } catch (error) {
      console.error('Error loading clients:', error);
      toast.error('Error al cargar los clientes');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: keyof Client) => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    setSortField(field);
  };

  const toggleFilter = () => {
    setShowFilter(!showFilter);
    if (showFilter) {
      setFilterCategory('');
    }
  };

  const handleFilterChange = (category: string) => {
    setFilterCategory(category);
  };

  const toggleAddForm = () => {
    setShowAddForm(!showAddForm);
  };

  const handleAddClient = async (formData: { name: string; category: string; subcategory: string; keywords: string[] }) => {
    try {
      await addClient({
        name: formData.name,
        category: formData.category,
        subcategory: formData.subcategory || null,
        keywords: formData.keywords || null
      });
      toast.success('Cliente añadido correctamente');
      setShowAddForm(false);
      loadClients();
    } catch (error) {
      console.error('Error adding client:', error);
      toast.error('Error al añadir el cliente');
    }
  };

  const handleEditClick = (client: Client) => {
    setEditingId(client.id);
    setEditFormData(client);
  };

  const handleEditFormChange = (updatedClient: Client) => {
    setEditFormData(updatedClient);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditFormData(null);
  };

  const saveEditedClient = async () => {
    if (!editFormData) return;

    try {
      await updateClient(editFormData);
      toast.success('Cliente actualizado correctamente');
      setEditingId(null);
      setEditFormData(null);
      loadClients();
    } catch (error) {
      console.error('Error updating client:', error);
      toast.error('Error al actualizar el cliente');
    }
  };

  const handleDeleteClient = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este cliente?')) return;

    try {
      await deleteClient(id);
      toast.success('Cliente eliminado correctamente');
      loadClients();
    } catch (error) {
      console.error('Error deleting client:', error);
      toast.error('Error al eliminar el cliente');
    }
  };

  return (
    <SettingsLayout
      title="Clientes"
      description="Administra los clientes disponibles en el sistema"
    >
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Clientes
          </span>
          <div className="flex gap-2">
            <ClientFilter 
              filterCategory={filterCategory}
              onFilterChange={handleFilterChange}
              showFilter={showFilter}
              onToggleFilter={toggleFilter}
            />
            <Button 
              size="sm"
              onClick={toggleAddForm}
            >
              {showAddForm ? 'Cancelar' : 'Añadir Cliente'}
            </Button>
          </div>
        </CardTitle>
        <CardDescription>
          Lista de clientes disponibles en el sistema
        </CardDescription>
      </CardHeader>

      <CardContent>
        {showAddForm && (
          <ClientForm 
            onSubmit={handleAddClient}
            onCancel={toggleAddForm}
          />
        )}

        {loading ? (
          <ClientLoadingState />
        ) : clients.length === 0 ? (
          <ClientEmptyState hasFilter={!!filterCategory} />
        ) : (
          <ClientsTable 
            clients={clients}
            sortField={sortField}
            sortOrder={sortOrder}
            onSort={handleSort}
            onEdit={handleEditClick}
            onDelete={handleDeleteClient}
            editingId={editingId}
            editFormData={editFormData}
            onEditFormChange={handleEditFormChange}
            onSaveEdit={saveEditedClient}
            onCancelEdit={handleCancelEdit}
            loading={loading}
          />
        )}
      </CardContent>
      <CardFooter className="flex justify-between border-t pt-6">
        <p className="text-xs text-muted-foreground">
          Los cambios en los clientes pueden afectar a las alertas y notificaciones del sistema
        </p>
        <Button variant="outline" onClick={loadClients}>
          Refrescar
        </Button>
      </CardFooter>
    </SettingsLayout>
  );
}
