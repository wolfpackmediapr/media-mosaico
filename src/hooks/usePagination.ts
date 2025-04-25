
import { useState, useMemo, useCallback } from 'react';

interface PaginationOptions {
  initialPage?: number;
  pageSize?: number;
  total?: number;
}

interface PaginationResult<T> {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  setPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  setPageSize: (size: number) => void;
  paginateItems: (items: T[]) => T[];
}

export function usePagination<T>({ 
  initialPage = 1, 
  pageSize = 10, 
  total = 0 
}: PaginationOptions = {}): PaginationResult<T> {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [itemsPerPage, setItemsPerPage] = useState(pageSize);
  
  // Calculate pagination values
  const totalPages = useMemo(() => {
    return total > 0 ? Math.ceil(total / itemsPerPage) : 0;
  }, [total, itemsPerPage]);
  
  // Ensure current page is within valid range
  useMemo(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);
  
  const startIndex = useMemo(() => {
    return (currentPage - 1) * itemsPerPage;
  }, [currentPage, itemsPerPage]);
  
  const endIndex = useMemo(() => {
    return Math.min(startIndex + itemsPerPage - 1, total - 1);
  }, [startIndex, itemsPerPage, total]);
  
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;
  
  // Page navigation functions
  const setPage = useCallback((page: number) => {
    const pageNumber = Math.max(1, Math.min(page, totalPages || 1));
    setCurrentPage(pageNumber);
  }, [totalPages]);
  
  const nextPage = useCallback(() => {
    if (hasNextPage) {
      setCurrentPage(prev => prev + 1);
    }
  }, [hasNextPage]);
  
  const prevPage = useCallback(() => {
    if (hasPrevPage) {
      setCurrentPage(prev => prev - 1);
    }
  }, [hasPrevPage]);
  
  const setPageSize = useCallback((size: number) => {
    setItemsPerPage(size);
    // Recalculate current page to ensure it's within bounds with new page size
    const newTotalPages = Math.ceil(total / size);
    if (currentPage > newTotalPages) {
      setCurrentPage(Math.max(1, newTotalPages));
    }
  }, [total, currentPage]);
  
  // Function to paginate array of items
  const paginateItems = useCallback((items: T[]) => {
    if (!items?.length) return [];
    return items.slice(startIndex, startIndex + itemsPerPage);
  }, [startIndex, itemsPerPage]);
  
  return {
    currentPage,
    pageSize: itemsPerPage,
    totalItems: total,
    totalPages,
    startIndex,
    endIndex,
    hasNextPage,
    hasPrevPage,
    setPage,
    nextPage,
    prevPage,
    setPageSize,
    paginateItems
  };
}
