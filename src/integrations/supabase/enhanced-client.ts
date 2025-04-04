
import { createClient } from '@supabase/supabase-js';
import { CustomDatabase } from './schema';

const SUPABASE_URL = "https://qpozetnbnzdinqkrafze.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwb3pldG5ibnpkaW5xa3JhZnplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc1NzQ1NjEsImV4cCI6MjA1MzE1MDU2MX0.9OhbyrHQHzKWh40HCw6L1ZQ8uqh-w8dF4acMTW-7b7Q";

export const supabaseTyped = createClient<CustomDatabase>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
