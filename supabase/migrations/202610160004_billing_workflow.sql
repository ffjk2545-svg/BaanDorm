alter table public.tenants
  add column if not exists line_user_id text,
  add column if not exists line_link_code text default gen_random_uuid()::text,
  add column if not exists line_link_expires_at timestamptz default (now() + interval '7 days');

alter table public.invoices
  add column if not exists public_token uuid not null default gen_random_uuid(),
  add column if not exists line_sent_at timestamptz;

alter table public.organizations
  add column if not exists document_display_name text,
  add column if not exists brand_logo_url text,
  add column if not exists promptpay_id text;

alter table public.properties
  add column if not exists logo_url text;

create unique index if not exists invoices_public_token_uidx
  on public.invoices(public_token);

create unique index if not exists tenants_org_line_user_uidx
  on public.tenants(organization_id, line_user_id)
  where line_user_id is not null;

create unique index if not exists tenants_line_link_code_uidx
  on public.tenants(line_link_code)
  where line_link_code is not null;

create or replace function public.add_invoice_fee(
  p_invoice_id uuid,
  p_description text,
  p_amount numeric
) returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  invoice_row public.invoices%rowtype;
begin
  select * into invoice_row
  from public.invoices
  where id = p_invoice_id
  for update;

  if not found then raise exception 'Invoice not found'; end if;
  if not public.has_org_role(invoice_row.organization_id, array['owner','manager','accountant']::public.member_role[]) then
    raise exception 'Permission denied';
  end if;
  if invoice_row.status <> 'draft' then raise exception 'Only draft invoices can be changed'; end if;
  if length(trim(coalesce(p_description, ''))) not between 1 and 120 then
    raise exception 'Description must be between 1 and 120 characters';
  end if;
  if p_amount is null or p_amount <= 0 or p_amount > 10000000 then
    raise exception 'Fee amount must be greater than zero';
  end if;

  insert into public.invoice_items(organization_id, invoice_id, description, quantity, unit_price, amount, metadata)
  values(invoice_row.organization_id, invoice_row.id, trim(p_description), 1, p_amount, p_amount,
         jsonb_build_object('kind', 'custom_fee'));

  update public.invoices
  set subtotal = (select coalesce(sum(amount), 0) from public.invoice_items where invoice_id = invoice_row.id),
      total = (select coalesce(sum(amount), 0) from public.invoice_items where invoice_id = invoice_row.id)
  where id = invoice_row.id;
end;
$$;

revoke all on function public.add_invoice_fee(uuid, text, numeric) from public;
grant execute on function public.add_invoice_fee(uuid, text, numeric) to authenticated;

create or replace function public.get_public_invoice(p_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, auth
as $$
  select jsonb_build_object(
    'invoice_number', i.invoice_number,
    'period_start', i.period_start,
    'period_end', i.period_end,
    'due_date', i.due_date,
    'total', i.total,
    'status', i.status,
    'tenant_name', t.full_name,
    'room_number', r.room_number,
    'property_name', p.name,
    'property_address', concat_ws(' ', nullif(p.address, ''), nullif(p.province, ''), nullif(p.postal_code, '')),
    'property_phone', p.phone,
    'property_logo_url', coalesce(p.logo_url, o.brand_logo_url),
    'organization_name', o.name,
    'document_display_name', coalesce(nullif(o.document_display_name, ''), o.name),
    'brand_logo_url', o.brand_logo_url,
    'promptpay_id', o.promptpay_id,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'description', ii.description,
        'quantity', ii.quantity,
        'unit_price', ii.unit_price,
        'amount', ii.amount
      ) order by ii.id)
      from public.invoice_items ii
      where ii.invoice_id = i.id
    ), '[]'::jsonb)
  )
  from public.invoices i
  join public.tenants t on t.id = i.tenant_id and t.organization_id = i.organization_id
  join public.leases l on l.id = i.lease_id and l.organization_id = i.organization_id
  join public.rooms r on r.id = l.room_id and r.organization_id = i.organization_id
  join public.properties p on p.id = r.property_id and p.organization_id = i.organization_id
  join public.organizations o on o.id = i.organization_id
  where i.public_token = p_token
    and i.status in ('issued', 'partial', 'paid', 'overdue');
$$;

revoke all on function public.get_public_invoice(uuid) from public;
grant execute on function public.get_public_invoice(uuid) to anon, authenticated;

create or replace function public.mark_invoice_line_sent(p_invoice_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  invoice_org_id uuid;
begin
  select organization_id into invoice_org_id
  from public.invoices
  where id = p_invoice_id;

  if invoice_org_id is null then raise exception 'Invoice not found'; end if;
  if not public.has_org_role(invoice_org_id, array['owner','manager','accountant']::public.member_role[]) then
    raise exception 'Permission denied';
  end if;

  update public.invoices set line_sent_at = now() where id = p_invoice_id;
end;
$$;

revoke all on function public.mark_invoice_line_sent(uuid) from public;
grant execute on function public.mark_invoice_line_sent(uuid) to authenticated;

create or replace function public.link_tenant_line_user(p_link_code text, p_line_user_id text)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  linked_id uuid;
begin
  if length(coalesce(p_line_user_id, '')) not between 20 and 40 then return false; end if;

  update public.tenants
  set line_user_id = p_line_user_id,
      line_link_code = null,
      line_link_expires_at = null
  where line_link_code = p_link_code
    and line_link_expires_at > now()
    and line_user_id is null
  returning id into linked_id;

  return linked_id is not null;
end;
$$;

revoke all on function public.link_tenant_line_user(text, text) from public;
grant execute on function public.link_tenant_line_user(text, text) to anon, authenticated;
