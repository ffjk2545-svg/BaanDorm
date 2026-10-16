# Database

Schema is introduced by `supabase/migrations/202610160001_initial_schema.sql`; transactional lease, invoice, and payment workflows are in `supabase/migrations/202610160002_business_transactions.sql`.

## Model

`organizations` own properties and all operational records. `organization_members` grants an authenticated user membership. `properties` contain `rooms`; `tenants` connect to rooms through dated `leases`; `meter_readings` and `utility_rates` record consumption and pricing. `invoices` have `invoice_items` and `payments`. `security_deposits` remain separate from rental revenue. Maintenance, assets, announcements, parcels, tasks, and audit events are organization-scoped.

Foreign keys include organization scope for property/room/tenant/lease relationships so a record in one activity cannot be linked across organizations. Unique indexes prevent duplicate room numbers, active leases per room, readings per day, and invoice periods. Numeric columns preserve currency and meter precision.

## Apply

Use the Supabase CLI (`supabase db push`) or apply ordered migration files with the Supabase SQL Editor. Apply in a disposable development project first. Keep local migrations in source control.

## Storage

The migration creates a private `property-evidence` bucket. Object paths must begin with the organization UUID; access policies check authenticated membership. Maximum object size is 10 MiB and accepted formats are JPEG, PNG, WebP, and PDF.
