
import { useState, useEffect, useCallback } from 'react';
import { ParticipantType } from '@/services/participantes/types';
import { 
  fetchParticipants, 
  createParticipant, 
  updateParticipant, 
  deleteParticipant 
} from '@/services/participantes/participantesService';
import { useToast } from '@/components/ui/use-toast';

export const useParticipantesManagement = () => {
  const [participants, setParticipants] = useState<ParticipantType[]>([]);
  const [filteredParticipants, setFilteredParticipants] = useState<ParticipantType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentParticipant, setCurrentParticipant] = useState<ParticipantType | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const { toast } = useToast();

  const loadParticipants = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchParticipants();
      setParticipants(data);
      setFilteredParticipants(data);
    } catch (error) {
      console.error('Error loading participants:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los participantes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadParticipants();
  }, [loadParticipants]);

  useEffect(() => {
    let filtered = [...participants];
    
    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.position.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (selectedCategory) {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }
    
    setFilteredParticipants(filtered);
    setCurrentPage(1); // Reset to first page when filtering
  }, [searchTerm, selectedCategory, participants]);

  const handleAddParticipant = async (participantData: Omit<ParticipantType, 'id'>) => {
    try {
      const newParticipant = await createParticipant(participantData);
      setParticipants(prev => [...prev, newParticipant]);
      toast({
        title: 'Éxito',
        description: 'Participante agregado correctamente',
      });
      setIsAdding(false);
      return true;
    } catch (error) {
      console.error('Error adding participant:', error);
      toast({
        title: 'Error',
        description: 'No se pudo agregar el participante',
        variant: 'destructive',
      });
      return false;
    }
  };

  const handleUpdateParticipant = async (participantData: ParticipantType) => {
    try {
      await updateParticipant(participantData);
      setParticipants(prev => 
        prev.map(p => p.id === participantData.id ? participantData : p)
      );
      toast({
        title: 'Éxito',
        description: 'Participante actualizado correctamente',
      });
      setIsEditing(false);
      setCurrentParticipant(null);
      return true;
    } catch (error) {
      console.error('Error updating participant:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el participante',
        variant: 'destructive',
      });
      return false;
    }
  };

  const handleDeleteParticipant = async (id: string) => {
    try {
      await deleteParticipant(id);
      setParticipants(prev => prev.filter(p => p.id !== id));
      toast({
        title: 'Éxito',
        description: 'Participante eliminado correctamente',
      });
      return true;
    } catch (error) {
      console.error('Error deleting participant:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el participante',
        variant: 'destructive',
      });
      return false;
    }
  };

  const startEdit = (participant: ParticipantType) => {
    setCurrentParticipant(participant);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setCurrentParticipant(null);
  };

  const startAdd = () => {
    setIsAdding(true);
  };

  const cancelAdd = () => {
    setIsAdding(false);
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredParticipants.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredParticipants.length / itemsPerPage);

  return {
    participants,
    filteredParticipants,
    currentItems,
    loading,
    searchTerm,
    selectedCategory,
    isAdding,
    isEditing,
    currentParticipant,
    currentPage,
    totalPages,
    setSearchTerm,
    setSelectedCategory,
    setCurrentPage,
    startAdd,
    cancelAdd,
    startEdit,
    cancelEdit,
    handleAddParticipant,
    handleUpdateParticipant,
    handleDeleteParticipant,
    loadParticipants
  };
};
