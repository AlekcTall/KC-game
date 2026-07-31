// js/supabase-config.js
// Инициализация клиента Supabase
// ВАЖНО: используй только anon (public) ключ. Никогда не используй service_role в браузере!

(function() {
  const SUPABASE_URL = https://zelcomhsdguzgtzhjkhk.supabase.co;           // например: https://zelcomhsdguzgtzhjkhk.supabase.co
  const SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplbGNvbWhzZGd1emd0emhqa2hrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0MTAxMjMsImV4cCI6MjEwMDk4NjEyM30.t3-Zd66YYgOrhpuGsDPdnFwFhBeaWkxvPHu9c4S_N2g; // начинается с eyJhbGciOi...

  if (typeof window.supabase === 'undefined') {
    console.error('[Supabase] SDK не загружен. Добавьте <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script> перед этим скриптом.');
    return;
  }

  window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  });

  // Короткий алиас для удобства
  window.supa = window.supabaseClient;
})();
