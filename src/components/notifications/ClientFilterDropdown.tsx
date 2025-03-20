
import React from "react";
import { Check, ChevronsUpDown, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

interface ClientFilterDropdownProps {
  clients: { id: string; name: string; category: string }[];
  selectedClient: string | null;
  onSelectClient: (clientId: string | null) => void;
  isLoading?: boolean;
}

const ClientFilterDropdown = ({
  clients,
  selectedClient,
  onSelectClient,
  isLoading = false,
}: ClientFilterDropdownProps) => {
  const [open, setOpen] = React.useState(false);
  
  const selectedClientName = React.useMemo(() => {
    if (!selectedClient) return null;
    const client = clients.find(c => c.id === selectedClient);
    return client?.name || null;
  }, [selectedClient, clients]);

  if (isLoading) {
    return (
      <Button variant="outline" className="w-full md:w-[250px] h-10 justify-start" disabled>
        <UserRound className="mr-2 h-4 w-4" />
        <span className="truncate">Cargando clientes...</span>
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full md:w-[250px] h-10 justify-between"
        >
          <div className="flex items-center truncate">
            <UserRound className="mr-2 h-4 w-4 shrink-0" />
            <span className="truncate">
              {selectedClientName ? selectedClientName : "Todos los clientes"}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0">
        <Command>
          <CommandInput placeholder="Buscar cliente..." />
          <CommandEmpty>No se encontraron clientes.</CommandEmpty>
          <CommandGroup>
            <CommandItem
              onSelect={() => {
                onSelectClient(null);
                setOpen(false);
              }}
              className="flex items-center"
            >
              <Check
                className={cn(
                  "mr-2 h-4 w-4",
                  !selectedClient ? "opacity-100" : "opacity-0"
                )}
              />
              <span>Todos los clientes</span>
            </CommandItem>
            {clients.map((client) => (
              <CommandItem
                key={client.id}
                onSelect={() => {
                  onSelectClient(client.id);
                  setOpen(false);
                }}
                className="flex items-center justify-between"
              >
                <div className="flex items-center">
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedClient === client.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span>{client.name}</span>
                </div>
                <Badge variant="outline" className="ml-2 text-xs">
                  {client.category}
                </Badge>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default ClientFilterDropdown;
