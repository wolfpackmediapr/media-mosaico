
import { useState } from 'react';
import { toast } from 'sonner';

interface MutationOptions<TData, TVariables, TContext, TError> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  onMutate?: (variables: TVariables) => Promise<TContext> | TContext;
  onSuccess?: (data: TData, variables: TVariables, context: TContext) => void | Promise<void>;
  onError?: (error: TError, variables: TVariables, context: TContext) => void | Promise<void>;
  onSettled?: (data: TData | undefined, error: TError | null, variables: TVariables, context: TContext) => void | Promise<void>;
  showSuccessToast?: boolean;
  showErrorToast?: boolean;
  successMessage?: string;
  errorMessage?: string;
}

export function useOptimisticMutation<
  TData = unknown, 
  TVariables = void, 
  TContext = unknown, 
  TError = Error
>(options: MutationOptions<TData, TVariables, TContext, TError>) {
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<TError | null>(null);
  const [data, setData] = useState<TData | null>(null);
  
  const mutate = async (variables: TVariables): Promise<TData | undefined> => {
    // Reset state
    setIsLoading(true);
    setIsSuccess(false);
    setIsError(false);
    setError(null);
    
    let context: TContext | undefined;
    
    try {
      // Call onMutate first for optimistic updates
      if (options.onMutate) {
        context = await options.onMutate(variables);
      }
      
      // Execute the mutation
      const result = await options.mutationFn(variables);
      
      // Update state with success
      setIsSuccess(true);
      setData(result);
      
      // Call onSuccess callback
      if (options.onSuccess) {
        await options.onSuccess(result, variables, context as TContext);
      }
      
      // Show success toast if enabled
      if (options.showSuccessToast) {
        toast.success(options.successMessage || 'Operación completada con éxito');
      }
      
      return result;
    } catch (err) {
      // Update state with error
      setIsError(true);
      setError(err as TError);
      
      // Call onError callback
      if (options.onError) {
        await options.onError(err as TError, variables, context as TContext);
      }
      
      // Show error toast if enabled
      if (options.showErrorToast) {
        toast.error(options.errorMessage || (err as Error).message || 'Ha ocurrido un error');
      }
      
      return undefined;
    } finally {
      setIsLoading(false);
      
      // Call onSettled callback
      if (options.onSettled) {
        await options.onSettled(data as TData, error, variables, context as TContext);
      }
    }
  };
  
  return {
    mutate,
    isLoading,
    isError,
    isSuccess,
    error,
    data,
    reset: () => {
      setIsError(false);
      setIsSuccess(false);
      setError(null);
      setData(null);
    }
  };
}
