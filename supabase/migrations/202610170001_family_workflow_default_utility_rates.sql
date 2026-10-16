-- Use the requested default rates for every existing property and any property added later.
-- Existing invoices are unchanged; invoice items are stored independently.
create or replace function public.seed_default_utility_rates()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  rate_start date := (now() at time zone 'Asia/Bangkok')::date;
begin
  insert into public.utility_rates (organization_id, property_id, utility, unit_rate, fixed_fee, effective_from, source_reference)
  values
    (new.organization_id, new.id, 'electricity', 8, 0, rate_start, 'อัตราที่เจ้าของกิจการกำหนด'),
    (new.organization_id, new.id, 'water', 12, 0, rate_start, 'อัตราที่เจ้าของกิจการกำหนด')
  on conflict (property_id, utility, effective_from)
  do update set unit_rate = excluded.unit_rate, fixed_fee = excluded.fixed_fee, source_reference = excluded.source_reference;
  return new;
end;
$$;

drop trigger if exists properties_seed_default_utility_rates on public.properties;
create trigger properties_seed_default_utility_rates
after insert on public.properties
for each row execute function public.seed_default_utility_rates();

do $$
declare
  property_row record;
  rate_start date := (now() at time zone 'Asia/Bangkok')::date;
begin
  for property_row in select id, organization_id from public.properties loop
    insert into public.utility_rates (organization_id, property_id, utility, unit_rate, fixed_fee, effective_from, source_reference)
    values
      (property_row.organization_id, property_row.id, 'electricity', 8, 0, rate_start, 'อัตราที่เจ้าของกิจการกำหนด'),
      (property_row.organization_id, property_row.id, 'water', 12, 0, rate_start, 'อัตราที่เจ้าของกิจการกำหนด')
    on conflict (property_id, utility, effective_from)
    do update set unit_rate = excluded.unit_rate, fixed_fee = excluded.fixed_fee, source_reference = excluded.source_reference;
  end loop;
end;
$$;

create or replace function public.create_tenant_and_lease(
  p_room_id uuid,
  p_full_name text,
  p_phone text,
  p_start_date date,
  p_rent_amount numeric,
  p_deposit_amount numeric,
  p_billing_day smallint default 1
) returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  room_row public.rooms%rowtype;
  tenant_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into room_row from public.rooms where id = p_room_id for update;
  if not found then raise exception 'Room not found'; end if;
  if not public.has_org_role(room_row.organization_id, array['owner','manager']::public.member_role[]) then
    raise exception 'Permission denied';
  end if;
  if room_row.status not in ('available','reserved') then raise exception 'Room is not available'; end if;
  if length(trim(coalesce(p_full_name, ''))) not between 2 and 120 then raise exception 'Invalid tenant name'; end if;
  if p_phone is not null and length(p_phone) > 30 then raise exception 'Invalid phone number'; end if;

  insert into public.tenants (organization_id, full_name, phone)
  values (room_row.organization_id, trim(p_full_name), nullif(trim(p_phone), ''))
  returning id into tenant_id;

  perform public.create_lease(p_room_id, tenant_id, p_start_date, null, p_rent_amount, p_deposit_amount, p_billing_day);
  return tenant_id;
end;
$$;

revoke all on function public.create_tenant_and_lease(uuid,text,text,date,numeric,numeric,smallint) from public;
grant execute on function public.create_tenant_and_lease(uuid,text,text,date,numeric,numeric,smallint) to authenticated;
