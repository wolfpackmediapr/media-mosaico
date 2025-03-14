
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ClientsTable } from "./ClientsTable";
import { ClientForm } from "./ClientForm";
import { ClientFilter } from "./ClientFilter";
import { ClientEmptyState } from "./ClientEmptyState";
import { ClientLoadingState } from "./ClientLoadingState";
import { Client } from "@/services/clients/clientService";

interface ClientsListProps {
  clients: Client[];
  allClients: Client[];
  categories: string[];
  isLoading: boolean;
  error: Error | null;
  showForm: boolean;
  setShowForm: (show: boolean) => void;
  editingClient: Client | null;
  filterCategory: string | null;
  setFilterCategory: (category: string | null) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  sortField: keyof Client;
  sortOrder: "asc" | "desc";
  hasFilters: boolean;
  onAddClient: (client: Client) => void;
  onUpdateClient: (client: Client) => void;
  onDeleteClient: (id: string) => void;
  onEditClient: (client: Client) => void;
  onSort: (field: keyof Client) => void;
  onCancelForm: () => void;
}

export function ClientsList({
  clients,
  allClients,
  categories,
  isLoading,
  error,
  showForm,
  setShowForm,
  editingClient,
  filterCategory,
  setFilterCategory,
  searchTerm,
  setSearchTerm,
  sortField,
  sortOrder,
  hasFilters,
  onAddClient,
  onUpdateClient,
  onDeleteClient,
  onEditClient,
  onSort,
  onCancelForm
}: ClientsListProps) {
  return (
    <>
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
            onSubmit={editingClient ? onUpdateClient : onAddClient} 
            onCancel={onCancelForm}
            isEditing={!!editingClient}
          />
        )}
        
        {/* Table */}
        {isLoading ? (
          <ClientLoadingState />
        ) : error ? (
          <div className="text-center py-8 text-red-500">
            Error al cargar clientes: {error.message}
          </div>
        ) : clients.length > 0 ? (
          <ClientsTable 
            clients={clients} 
            onEdit={onEditClient} 
            onDelete={onDeleteClient}
            sortField={sortField}
            sortOrder={sortOrder}
            onSort={onSort}
          />
        ) : allClients.length > 0 ? (
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
    </>
  );
}
