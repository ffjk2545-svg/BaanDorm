-- Family helper access is intentionally limited to meter readings and
-- maintenance work. Finance and administrative tables remain available to
-- owners, managers, and accountants only.
do $$
declare
  t text;
begin
  foreach t in array array[
    'properties','rooms','tenants','leases','utility_rates','meter_readings',
    'invoices','invoice_items','payments','expenses','security_deposits',
    'maintenance_tickets','assets','announcements','parcels','tasks','audit_events'
  ] loop
    execute format('drop policy if exists %I on public.%I', t || '_org_access', t);
  end loop;
end $$;

-- Keep organization-level isolation, then grant table-specific access.
drop policy if exists rooms_staff_read on public.rooms;
drop policy if exists rooms_managers_manage on public.rooms;
create policy rooms_staff_read on public.rooms for select to authenticated
  using (public.is_staff_member(organization_id));
create policy rooms_managers_manage on public.rooms for all to authenticated
  using (public.has_org_role(organization_id, array['owner','manager']::public.member_role[]))
  with check (public.has_org_role(organization_id, array['owner','manager']::public.member_role[]));

drop policy if exists properties_staff_read on public.properties;
drop policy if exists properties_managers_manage on public.properties;
create policy properties_staff_read on public.properties for select to authenticated
  using (public.is_staff_member(organization_id));
create policy properties_managers_manage on public.properties for all to authenticated
  using (public.has_org_role(organization_id, array['owner','manager']::public.member_role[]))
  with check (public.has_org_role(organization_id, array['owner','manager']::public.member_role[]));

drop policy if exists tenants_finance_read on public.tenants;
drop policy if exists tenants_managers_manage on public.tenants;
create policy tenants_finance_read on public.tenants for select to authenticated
  using (public.has_org_role(organization_id, array['owner','manager','accountant']::public.member_role[]));
create policy tenants_managers_manage on public.tenants for all to authenticated
  using (public.has_org_role(organization_id, array['owner','manager']::public.member_role[]))
  with check (public.has_org_role(organization_id, array['owner','manager']::public.member_role[]));

drop policy if exists leases_staff_read on public.leases;
drop policy if exists leases_manager_read on public.leases;
drop policy if exists leases_managers_manage on public.leases;
create policy leases_manager_read on public.leases for select to authenticated
  using (public.has_org_role(organization_id, array['owner','manager','accountant']::public.member_role[]));
create policy leases_managers_manage on public.leases for all to authenticated
  using (public.has_org_role(organization_id, array['owner','manager']::public.member_role[]))
  with check (public.has_org_role(organization_id, array['owner','manager']::public.member_role[]));

drop policy if exists utility_rates_staff_read on public.utility_rates;
drop policy if exists utility_rates_finance_manage on public.utility_rates;
create policy utility_rates_staff_read on public.utility_rates for select to authenticated
  using (public.is_staff_member(organization_id));
create policy utility_rates_finance_manage on public.utility_rates for all to authenticated
  using (public.has_org_role(organization_id, array['owner','manager','accountant']::public.member_role[]))
  with check (public.has_org_role(organization_id, array['owner','manager','accountant']::public.member_role[]));

drop policy if exists meter_readings_staff_read on public.meter_readings;
drop policy if exists meter_readings_staff_add on public.meter_readings;
drop policy if exists meter_readings_staff_correct on public.meter_readings;
drop policy if exists meter_readings_staff_delete on public.meter_readings;
create policy meter_readings_staff_read on public.meter_readings for select to authenticated
  using (public.is_staff_member(organization_id));
create policy meter_readings_staff_add on public.meter_readings for insert to authenticated
  with check (public.is_staff_member(organization_id));
create policy meter_readings_staff_correct on public.meter_readings for update to authenticated
  using (public.is_staff_member(organization_id)) with check (public.is_staff_member(organization_id));
create policy meter_readings_staff_delete on public.meter_readings for delete to authenticated
  using (public.has_org_role(organization_id, array['owner','manager']::public.member_role[]));

-- Financial records: staff can no longer read them via the previous broad
-- staff-read policies. Accountants retain finance access, owners/managers retain
-- existing finance access.
drop policy if exists invoices_staff_read on public.invoices;
drop policy if exists invoices_finance_manage on public.invoices;
create policy invoices_finance_read on public.invoices for select to authenticated
  using (public.has_org_role(organization_id, array['owner','manager','accountant']::public.member_role[]));
create policy invoices_finance_manage on public.invoices for all to authenticated
  using (public.has_org_role(organization_id, array['owner','manager','accountant']::public.member_role[]))
  with check (public.has_org_role(organization_id, array['owner','manager','accountant']::public.member_role[]));

drop policy if exists invoice_items_staff_read on public.invoice_items;
drop policy if exists invoice_items_finance_manage on public.invoice_items;
create policy invoice_items_finance_read on public.invoice_items for select to authenticated
  using (public.has_org_role(organization_id, array['owner','manager','accountant']::public.member_role[]));
create policy invoice_items_finance_manage on public.invoice_items for all to authenticated
  using (public.has_org_role(organization_id, array['owner','manager','accountant']::public.member_role[]))
  with check (public.has_org_role(organization_id, array['owner','manager','accountant']::public.member_role[]));

drop policy if exists payments_staff_read on public.payments;
drop policy if exists payments_finance_manage on public.payments;
create policy payments_finance_read on public.payments for select to authenticated
  using (public.has_org_role(organization_id, array['owner','manager','accountant']::public.member_role[]));
create policy payments_finance_manage on public.payments for all to authenticated
  using (public.has_org_role(organization_id, array['owner','manager','accountant']::public.member_role[]))
  with check (public.has_org_role(organization_id, array['owner','manager','accountant']::public.member_role[]));

drop policy if exists expenses_staff_read on public.expenses;
drop policy if exists expenses_finance_manage on public.expenses;
create policy expenses_finance_read on public.expenses for select to authenticated
  using (public.has_org_role(organization_id, array['owner','manager','accountant']::public.member_role[]));
create policy expenses_finance_manage on public.expenses for all to authenticated
  using (public.has_org_role(organization_id, array['owner','manager','accountant']::public.member_role[]))
  with check (public.has_org_role(organization_id, array['owner','manager','accountant']::public.member_role[]));

drop policy if exists deposits_staff_read on public.security_deposits;
drop policy if exists deposits_finance_manage on public.security_deposits;
create policy deposits_finance_read on public.security_deposits for select to authenticated
  using (public.has_org_role(organization_id, array['owner','manager','accountant']::public.member_role[]));
create policy deposits_finance_manage on public.security_deposits for all to authenticated
  using (public.has_org_role(organization_id, array['owner','manager','accountant']::public.member_role[]))
  with check (public.has_org_role(organization_id, array['owner','manager','accountant']::public.member_role[]));

-- Staff members can log and update maintenance tickets, but cannot rewrite the
-- reported issue or move the ticket between organizations while doing so.
drop policy if exists maintenance_tickets_staff_access on public.maintenance_tickets;
drop policy if exists maintenance_tickets_staff_read on public.maintenance_tickets;
drop policy if exists maintenance_tickets_staff_add on public.maintenance_tickets;
drop policy if exists maintenance_tickets_staff_update on public.maintenance_tickets;
drop policy if exists maintenance_tickets_managers_delete on public.maintenance_tickets;
create policy maintenance_tickets_staff_read on public.maintenance_tickets for select to authenticated
  using (public.is_staff_member(organization_id));
create policy maintenance_tickets_staff_add on public.maintenance_tickets for insert to authenticated
  with check (public.is_staff_member(organization_id));
create policy maintenance_tickets_staff_update on public.maintenance_tickets for update to authenticated
  using (public.is_staff_member(organization_id)) with check (public.is_staff_member(organization_id));
create policy maintenance_tickets_managers_delete on public.maintenance_tickets for delete to authenticated
  using (public.has_org_role(organization_id, array['owner','manager']::public.member_role[]));

do $$
declare
  t text;
begin
  foreach t in array array['assets','announcements','parcels','tasks'] loop
    execute format('drop policy if exists %I on public.%I', t || '_manager_read', t);
    execute format('drop policy if exists %I on public.%I', t || '_managers_manage', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.has_org_role(organization_id, array[''owner'',''manager'']::public.member_role[])) with check (public.has_org_role(organization_id, array[''owner'',''manager'']::public.member_role[]))',
      t || '_managers_manage', t
    );
  end loop;
end $$;

create or replace function public.guard_staff_ticket_update()
returns trigger language plpgsql security definer set search_path = public, auth as $$
begin
  if not public.has_org_role(old.organization_id, array['owner','manager']::public.member_role[])
     and (to_jsonb(new) - array['status','resolved_at','updated_at'])
         is distinct from (to_jsonb(old) - array['status','resolved_at','updated_at']) then
    raise exception 'Staff may only update ticket status';
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists maintenance_ticket_staff_guard on public.maintenance_tickets;
create trigger maintenance_ticket_staff_guard before update on public.maintenance_tickets
  for each row execute function public.guard_staff_ticket_update();

drop policy if exists audit_events_member_read on public.audit_events;
create policy audit_events_finance_read on public.audit_events for select to authenticated
  using (public.has_org_role(organization_id, array['owner','manager','accountant']::public.member_role[]));

-- Remove broad access to property evidence, which can include payment and
-- expense documents. A future maintenance-upload flow can add ticket-scoped
-- storage policies independently.
drop policy if exists "Organization members read private evidence" on storage.objects;
drop policy if exists "Organization members upload private evidence" on storage.objects;
drop policy if exists "Organization members delete private evidence" on storage.objects;
create policy "Finance members read private evidence" on storage.objects for select to authenticated
  using (bucket_id = 'property-evidence' and public.has_org_role((storage.foldername(name))[1]::uuid, array['owner','manager','accountant']::public.member_role[]));
create policy "Finance members upload private evidence" on storage.objects for insert to authenticated
  with check (bucket_id = 'property-evidence' and public.has_org_role((storage.foldername(name))[1]::uuid, array['owner','manager','accountant']::public.member_role[]));
create policy "Finance members delete private evidence" on storage.objects for delete to authenticated
  using (bucket_id = 'property-evidence' and public.has_org_role((storage.foldername(name))[1]::uuid, array['owner','manager','accountant']::public.member_role[]));

-- Owners can add an already-registered family account and assign a limited
-- staff or finance role without exposing auth.users to the browser.
create or replace function public.manage_family_member(p_email text, p_role public.member_role)
returns void language plpgsql security definer set search_path = public, auth as $$
declare
  org_id uuid;
  member_id uuid;
begin
  select o.id into org_id from public.organizations o where o.owner_user_id = auth.uid() limit 1;
  if org_id is null then raise exception 'Only the organization owner can manage family access'; end if;
  if p_role not in ('staff','accountant') then raise exception 'Unsupported family role'; end if;
  if length(trim(coalesce(p_email, ''))) = 0 then raise exception 'Email is required'; end if;
  select u.id into member_id from auth.users u where lower(u.email) = lower(trim(p_email)) limit 1;
  if member_id is null then raise exception 'No registered account was found for this email'; end if;
  if member_id = auth.uid() then raise exception 'The owner account role cannot be changed here'; end if;
  insert into public.organization_members(organization_id,user_id,role)
  values (org_id,member_id,p_role)
  on conflict (organization_id,user_id) do update set role = excluded.role;
end $$;
revoke all on function public.manage_family_member(text,public.member_role) from public;
grant execute on function public.manage_family_member(text,public.member_role) to authenticated;

create or replace function public.list_family_members()
returns table(user_id uuid, email text, role public.member_role)
language sql stable security definer set search_path = public, auth as $$
  select m.user_id,u.email,m.role
  from public.organization_members m
  join public.organizations o on o.id=m.organization_id and o.owner_user_id=auth.uid()
  join auth.users u on u.id=m.user_id
  order by case m.role when 'owner' then 0 when 'staff' then 1 else 2 end, lower(u.email)
$$;
revoke all on function public.list_family_members() from public;
grant execute on function public.list_family_members() to authenticated;

-- Enable Postgres Changes for the events that refresh the family dashboard.
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    raise exception 'Supabase Realtime publication is missing';
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'payments') then
    alter publication supabase_realtime add table public.payments;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'maintenance_tickets') then
    alter publication supabase_realtime add table public.maintenance_tickets;
  end if;
end $$;

