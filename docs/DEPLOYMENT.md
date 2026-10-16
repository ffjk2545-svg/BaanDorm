# Deployment: GitHub, Vercel, Supabase

1. Create a Supabase project and store its URL and anon/publishable key in a password manager.
2. Apply migrations in `supabase/migrations/`. Confirm RLS is enabled on every public table and verify the private `property-evidence` bucket.
3. In Supabase Auth, set the Site URL and allowlisted local, preview, and production callback URLs. Enable email confirmation and configure SMTP for production.
4. Create `.env.local` from `.env.example` for development. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `NEXT_PUBLIC_APP_URL`. The service-role key is not needed by this app.
5. For LINE invoices, configure a LINE Official Account Messaging API channel, set `LINE_CHANNEL_ACCESS_TOKEN` and `LINE_CHANNEL_SECRET` as Vercel secrets, and set the provider webhook URL to `https://<your-domain>/api/line/webhook`. Enable webhook use and verify it in LINE Developers. Tenants link by sending `LINK <รหัสเชื่อม LINE>` to the Official Account; the family copies the one-time code from the Tenants page. The code expires after seven days.
6. In KumkongApartment Settings, set the document business name, logo HTTPS URL, and PromptPay ID. PromptPay QR is generated for the displayed amount; payment still needs to be confirmed by the family in the app.
7. Push the repository to GitHub, import it in Vercel, and set the same public Supabase variables and LINE secrets for Preview and Production. Deploy and verify build output.
8. Set production Auth Site URL/redirect URLs to the deployed domain. Test sign-up, email confirmation, onboarding, and an organization boundary with two users.
9. Reapply migrations through the Supabase CLI migration workflow for later changes. Back up before production schema changes.

Do not claim a deployment is complete until the actual Supabase and Vercel projects have been configured and verified.
