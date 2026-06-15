import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AlertFormType = "tv" | "radio";
export type AlertFormFilter = AlertFormType | "all";

export interface TypeformAlert {
  id: string;
  formType: AlertFormType;
  submittedAt: string;
  channel?: string;
  program?: string;
  title?: string;
  summary?: string;
  category?: string;
  tags: string[];
  clients: string[];
  rawAnswers: Record<string, string | string[]>;
}

interface AlertsResponse {
  items: TypeformAlert[];
  total: number;
  errors?: Record<string, string>;
  tvFormConfigured?: boolean;
}

interface Params {
  form: AlertFormFilter;
  search?: string;
  since?: string;
  until?: string;
  pageSize?: number;
  page?: number;
}

export function useTypeformAlerts(params: Params) {
  const { form, search = "", since, until, pageSize = 25, page = 1 } = params;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["typeform-alerts", form, search, since, until, pageSize, page],
    queryFn: async (): Promise<AlertsResponse> => {
      const { data, error } = await supabase.functions.invoke("get-typeform-alerts", {
        body: { form, search, since, until, page_size: pageSize, page },
      });
      if (error) throw error;
      return data as AlertsResponse;
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return {
    ...query,
    refresh: () => queryClient.invalidateQueries({ queryKey: ["typeform-alerts"] }),
  };
}