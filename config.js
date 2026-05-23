// =============================================================
// Configuración de la base de datos compartida (Supabase)
// =============================================================
// Edita este archivo UNA SOLA VEZ con los valores de tu proyecto Supabase.
// Después, todos los usuarios que abran el portal se conectarán
// automáticamente — sin pantalla de configuración.
//
// Dónde encontrar estos valores:
//   Supabase Dashboard → Project Settings → API
//     - "Project URL"        → SUPABASE_URL
//     - "anon public" key    → SUPABASE_ANON_KEY
//
// La anon key está diseñada para exponerse en el navegador. Es seguro
// commitearla al repositorio. La key que NUNCA se debe exponer es
// "service_role" — esa solo se usa en servidores.
// =============================================================
window.SUPABASE_CONFIG = {
  url: 'https://abcdefghijklmnop.supabase.co',  // ej: 'https://abcdefghijklmnop.supabase.co'
  key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJsb2JqdW1iZ3hxbWdzb3JqY2h1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1MTMwMTEsImV4cCI6MjA5NTA4OTAxMX0.U9WOgLbrOPt4ZOwJB-GFJpFCIEhqSf-yJVgSEVU2Mag',  // anon public key (string largo que empieza con 'eyJ...')
};
