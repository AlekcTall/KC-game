// js/supabase-config.js
const SUPABASE_URL = 'https://zelcomhsdguzgtzhjkhk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplbGNvbWhzZGd1emd0emhqa2hrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0MTAxMjMsImV4cCI6MjEwMDk4NjEyM30.t3-Zd66YYgOrhpuGsDPdnFwFhBeaWkxvPHu9c4S_N2g';

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
