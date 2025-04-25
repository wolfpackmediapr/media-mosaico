
import { useState, useEffect, useCallback } from 'react';

interface PaginationOptions<T> {
  fetchData: (page: number, pageSize: number) => Promise<{
    data: T[];
    count: number;
  }>;
  initialPage?: number;
  pageSize?: number;
  dependencies?: any[];
}

export function usePaginatedData<T>({
  fetchData,
  initialPage = 1,
  pageSize = 10,
  dependencies = []
}: PaginationOptions<T>) {
  const [data, setData] = useState<T[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const loadData = useCallback(async (page: number) => {
    if (page < 1) page = 1;
    if (page > totalPages && totalPages > 0) page = totalPages;

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchData(page, pageSize);
      setData(result.data);
      setTotalCount(result.count);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch data'));
      return { data: [], count: 0 };
    } finally {
      setIsLoading(false);
    }
  }, [fetchData, pageSize, totalPages]);

  const goToPage = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const nextPage = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  }, [currentPage, totalPages]);

  const prevPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  }, [currentPage]);

  useEffect(() => {
    loadData(currentPage);
  }, [currentPage, loadData, ...dependencies]);

  return {
    data,
    isLoading,
    error,
    currentPage,
    totalPages,
    totalCount,
    pageSize,
    goToPage,
    nextPage,
    prevPage,
    refresh: () => loadData(currentPage),
  };
}
