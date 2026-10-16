# Deployment: GitHub, Vercel, Supabase

1. Create a Supabase project and store its URL and anon/publishable key in a password manager.
2. Apply migrations in `supabase/migrations/`. Confirm RLS is enabled on every public table and verify the private `property-evidence` bucket.
3. In Supabase Auth, set the Site URL and allowlisted local, preview, and production callback URLs. Enable email confirmation and configure SMTP for production.
4. Create `.env.local` from `.env.example` for development. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `NEXT_PUBLIC_APP_URL`. The service-role key is not needed by this app.
5. Push the repository to GitHub, import it in Vercel, and set the same public Supabase variables for Preview and Production. Deploy and verify build output.
6. Set production Auth Site URL/redirect URLs to the deployed domain. Test sign-up, email confirmation, onboarding, and an organization boundary with two users.
7. Reapply migrations through the Supabase CLI migration workflow for later changes. Back up before production schema changes.

Do not claim a deployment is complete until the actual Supabase and Vercel projects have been configured and verified.
