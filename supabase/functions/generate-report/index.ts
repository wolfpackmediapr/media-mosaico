import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { dateRange, type, format } = await req.json();

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get transcriptions within date range
    const { data: transcriptions, error: transcriptionsError } = await supabase
      .from('transcriptions')
      .select('*')
      .gte('created_at', dateRange.start)
      .lte('created_at', dateRange.end);

    if (transcriptionsError) throw transcriptionsError;

    // Get alerts within date range
    const { data: alerts, error: alertsError } = await supabase
      .from('client_alerts')
      .select('*')
      .gte('created_at', dateRange.start)
      .lte('created_at', dateRange.end);

    if (alertsError) throw alertsError;

    // Process data based on report type
    const reportData = {
      transcriptions: transcriptions || [],
      alerts: alerts || [],
      summary: {
        totalTranscriptions: transcriptions?.length || 0,
        totalAlerts: alerts?.length || 0,
        categories: {},
        criticalAlerts: alerts?.filter(a => a.priority === 'critical') || [],
      },
    };

    // Create report record
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .insert([
        {
          title: `${type} Report - ${new Date().toLocaleDateString()}`,
          date_range: `[${dateRange.start},${dateRange.end}]`,
          type,
          format,
          status: 'completed',
          data: reportData,
        },
      ])
      .select()
      .single();

    if (reportError) throw reportError;

    return new Response(
      JSON.stringify({ success: true, report }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating report:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});