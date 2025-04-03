
import { useState, useEffect } from "react";
import { RateType, MediaType, ProgramType } from "./types";

interface UseRatesFilteringProps<T extends RateType> {
  rates: T[];
  mediaIdField: string;
  programIdField: string;
  mediaType: 'tv' | 'radio';
  itemsPerPage: number;
}

interface UseRatesFilteringReturn<T extends RateType> {
  filteredRates: T[];
  selectedMedia: string;
  selectedProgram: string;
  searchTerm: string;
  currentPage: number;
  totalPages: number;
  paginatedRates: T[];
  setSearchTerm: (term: string) => void;
  setSelectedMedia: (mediaId: string) => void;
  setSelectedProgram: (programId: string) => void;
  setCurrentPage: (page: number) => void;
  totalRates: number;
}

export function useRatesFiltering<T extends RateType>({
  rates,
  mediaIdField,
  programIdField,
  mediaType,
  itemsPerPage
}: UseRatesFilteringProps<T>): UseRatesFilteringReturn<T> {
  const [filteredRates, setFilteredRates] = useState<T[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<string>('all');
  const [selectedProgram, setSelectedProgram] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filter rates when filters change
  useEffect(() => {
    const filterRates = () => {
      try {
        let filtered = [...rates];
        
        // Apply search filter if provided
        if (searchTerm) {
          filtered = filtered.filter(rate => {
            const mediaName = rate[`${mediaType === 'tv' ? 'channel' : 'station'}_name`];
            const programName = rate.program_name;
            
            return (
              (mediaName && mediaName.toLowerCase().includes(searchTerm.toLowerCase())) ||
              (programName && programName.toLowerCase().includes(searchTerm.toLowerCase()))
            );
          });
        }
        
        // Apply media filter if selected
        if (selectedMedia !== 'all') {
          filtered = filtered.filter(rate => rate[mediaIdField] === selectedMedia);
        }
        
        // Apply program filter if selected
        if (selectedProgram !== 'all') {
          filtered = filtered.filter(rate => rate[programIdField] === selectedProgram);
        }
        
        setFilteredRates(filtered);
        
        // Reset to page 1 when filter changes
        setCurrentPage(1);
        
        // Calculate total pages
        const newTotalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
        setTotalPages(newTotalPages);
      } catch (error) {
        console.error(`Error filtering ${mediaType} rates:`, error);
      }
    };
    
    filterRates();
  }, [selectedMedia, selectedProgram, searchTerm, rates, mediaIdField, programIdField, mediaType, itemsPerPage]);

  // Get rates for current page
  const getPaginatedRates = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredRates.slice(startIndex, endIndex);
  };

  return {
    filteredRates,
    selectedMedia,
    selectedProgram,
    searchTerm,
    currentPage,
    totalPages,
    paginatedRates: getPaginatedRates(),
    setSearchTerm,
    setSelectedMedia,
    setSelectedProgram,
    setCurrentPage,
    totalRates: filteredRates.length
  };
}
