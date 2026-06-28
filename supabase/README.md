# CineVerse Supabase setup

1. Create a Supabase project.
2. Open the SQL editor and run `supabase/schema.sql`.
3. Copy your project URL and anon key into `js/app.js`:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
4. Deploy the Edge Function:
   - `supabase functions deploy new-signup-notify`
5. Add Edge Function secrets:
   - `supabase secrets set RESEND_API_KEY=your_resend_key`
   - `supabase secrets set FROM_EMAIL="CineVerse <your-verified-email@domain.com>"`

When a visitor signs up, the browser creates the Supabase auth user, stores a profile row, and invokes `new-signup-notify`, which sends an email to `aroobaasghar37@gmail.com`.
