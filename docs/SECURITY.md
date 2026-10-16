# Security

- Authentication uses Supabase Auth with the SSR cookie flow; requests refresh sessions through `src/proxy.ts`.
- Server code uses the anon key and the signed-in user's session so database RLS stays active. The service role key is not used by application code.
- Every operational table has RLS. Tenant-role members are excluded from operational records. Finance table writes are limited to owner, manager, and accountant; other module writes still need a finer role matrix. Do not add a new exposed table without RLS, grants, and policies.
- Audit rows are readable by staff but only the database trigger writes them. The audit trigger records changes to rooms, tenants, leases, meters, invoices, payments, expenses, and maintenance tickets.
- Evidence is held in a private storage bucket with organization-folder policies.
- Zod validates sign-in, signup, onboarding, room, tenant, and meter form inputs on the server.
- Never store secrets in `NEXT_PUBLIC_*` except the Supabase URL and publishable/anon key. Do not commit `.env.local`.

## Production hardening before inviting staff/tenants

1. Replace broad member write policies with role-specific policies and server-authorize every sensitive action.
2. Add isolated RLS tests for two users in different organizations and for tenant accounts.
3. Add immutable, append-only correction workflows for issued invoices and receipts.
4. Configure Supabase Auth email confirmation, password recovery, redirect allowlists, MFA where appropriate, database backups, and alerts.
5. Review `SECURITY DEFINER` functions and policies after each schema change.
