/* =====================================================================
   CLOUD CONFIG — where the online save lives (Supabase).
   Fill in the two values from your Supabase project:
   Project Settings → API (or "Connect"): the Project URL and the
   anon / publishable key. Both are meant to be public; the database
   only allows the two save functions from supabase-setup.sql.
   Leave them empty and the game saves on this device only, like before.
   ===================================================================== */
window.LQ = window.LQ || {};
LQ.CloudConfig = {
  url: '',      // e.g. 'https://abcdefghijk.supabase.co'
  anonKey: ''   // e.g. 'sb_publishable_…' or 'eyJhbGciOi…'
};
