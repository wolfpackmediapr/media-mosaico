
import { useState, useEffect, useMemo } from 'react';
import { fetchParticipants, createParticipant, updateParticipant, deleteParticipant } from '@/services/participantes/participantesService';
import { ParticipantType } from '@/services/participantes/types';
import { toast } from 'sonner';

export const useParticipantesManagement = () => {
  const [participants, setParticipants] = useState<ParticipantType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentParticipant, setCurrentParticipant] = useState<ParticipantType | null>(null);
  
  const itemsPerPage = 10;

  // Load participants
  useEffect(() => {
    const loadParticipants = async () => {
      setLoading(true);
      try {
        const data = await fetchParticipants();
        setParticipants(data);
      } catch (error) {
        console.error('Error loading participants:', error);
        toast.error('No se pudieron cargar los participantes.');
      } finally {
        setLoading(false);
      }
    };
    
    loadParticipants();
  }, []);

  // Filtered participants
  const filteredParticipants = useMemo(() => {
    return participants.filter(participant => {
      const matchesSearch = searchTerm === '' || 
        participant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        participant.position.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategory === 'all' || 
        participant.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [participants, searchTerm, selectedCategory]);

  // Pagination
  const totalPages = Math.ceil(filteredParticipants.length / itemsPerPage);
  
  const currentItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredParticipants.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredParticipants, currentPage]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory]);

  // Form handling
  const startAdd = () => {
    setIsAdding(true);
  };

  const cancelAdd = () => {
    setIsAdding(false);
  };

  const startEdit = (participant: ParticipantType) => {
    setCurrentParticipant(participant);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setCurrentParticipant(null);
    setIsEditing(false);
  };

  const handleAddParticipant = async (data: Omit<ParticipantType, 'id'>) => {
    try {
      const newParticipant = await createParticipant(data);
      setParticipants([...participants, newParticipant]);
      toast.success('Participante agregado correctamente.');
      return true;
    } catch (error) {
      console.error('Error adding participant:', error);
      toast.error('No se pudo agregar el participante.');
      return false;
    }
  };

  const handleUpdateParticipant = async (data: ParticipantType) => {
    try {
      const updatedParticipant = await updateParticipant(data);
      setParticipants(
        participants.map(p => p.id === updatedParticipant.id ? updatedParticipant : p)
      );
      toast.success('Participante actualizado correctamente.');
      return true;
    } catch (error) {
      console.error('Error updating participant:', error);
      toast.error('No se pudo actualizar el participante.');
      return false;
    }
  };

  const handleDeleteParticipant = async (id: string): Promise<boolean> => {
    if (window.confirm('¿Está seguro de eliminar este participante?')) {
      try {
        await deleteParticipant(id);
        setParticipants(participants.filter(p => p.id !== id));
        toast.success('Participante eliminado correctamente.');
        return true;
      } catch (error) {
        console.error('Error deleting participant:', error);
        toast.error('No se pudo eliminar el participante.');
        return false;
      }
    }
    return false;
  };

  return {
    participants,
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
    handleDeleteParticipant
  };
};
