create or replace function public.create_lease(
  p_room_id uuid, p_tenant_id uuid, p_start_date date, p_end_date date,
  p_rent_amount numeric, p_deposit_amount numeric, p_billing_day smallint
) returns uuid language plpgsql security definer set search_path=public,auth as $$
declare room_row public.rooms%rowtype; new_id uuid;
begin
  select * into room_row from public.rooms where id=p_room_id for update;
  if not found then raise exception 'Room not found'; end if;
  if not public.has_org_role(room_row.organization_id,array['owner','manager']::public.member_role[]) then raise exception 'Permission denied'; end if;
  if room_row.status not in ('available','reserved') then raise exception 'Room is not available'; end if;
  if not exists(select 1 from public.tenants where id=p_tenant_id and organization_id=room_row.organization_id) then raise exception 'Tenant does not belong to this organization'; end if;
  if p_start_date>(now() at time zone 'Asia/Bangkok')::date or (p_end_date is not null and p_end_date<(now() at time zone 'Asia/Bangkok')::date) then raise exception 'Lease dates must include today'; end if;
  if p_end_date is not null and p_end_date<p_start_date then raise exception 'Invalid lease dates'; end if;
  if p_rent_amount<0 or p_deposit_amount<0 or p_billing_day not between 1 and 28 then raise exception 'Invalid lease terms'; end if;
  insert into public.leases(organization_id,room_id,tenant_id,start_date,end_date,rent_amount,deposit_amount,billing_day,status)
  values(room_row.organization_id,p_room_id,p_tenant_id,p_start_date,p_end_date,p_rent_amount,p_deposit_amount,p_billing_day,'active') returning id into new_id;
  update public.rooms set status='occupied' where id=p_room_id;
  if p_deposit_amount>0 then insert into public.security_deposits(organization_id,lease_id,amount_received) values(room_row.organization_id,new_id,p_deposit_amount); end if;
  return new_id;
end $$;
revoke all on function public.create_lease(uuid,uuid,date,date,numeric,numeric,smallint) from public;
grant execute on function public.create_lease(uuid,uuid,date,date,numeric,numeric,smallint) to authenticated;

create or replace function public.end_lease(
  p_lease_id uuid, p_end_date date, p_refund numeric, p_deduction numeric, p_notes text default null
) returns void language plpgsql security definer set search_path=public,auth as $$
declare lease_row public.leases%rowtype; deposit_row public.security_deposits%rowtype;
begin
  select * into lease_row from public.leases where id=p_lease_id for update;
  if not found then raise exception 'Lease not found'; end if;
  if not public.has_org_role(lease_row.organization_id,array['owner','manager']::public.member_role[]) then raise exception 'Permission denied'; end if;
  if lease_row.status<>'active' then raise exception 'Lease is not active'; end if;
  if p_end_date<lease_row.start_date or p_end_date>(now() at time zone 'Asia/Bangkok')::date then raise exception 'Invalid move-out date'; end if;
  if p_refund<0 or p_deduction<0 then raise exception 'Deposit amounts cannot be negative'; end if;
  select * into deposit_row from public.security_deposits where lease_id=p_lease_id for update;
  if found then
    if p_refund+p_deduction<>deposit_row.amount_received-deposit_row.amount_refunded-deposit_row.amount_deducted then raise exception 'Refund and deduction must settle the remaining deposit'; end if;
    update public.security_deposits set amount_refunded=amount_refunded+p_refund, amount_deducted=amount_deducted+p_deduction, settlement_due_on=p_end_date+7, settled_on=(now() at time zone 'Asia/Bangkok')::date,
      status=case when p_refund=deposit_row.amount_received and p_deduction=0 then 'refunded' when p_deduction=deposit_row.amount_received and p_refund=0 then 'forfeited' else 'partially_refunded' end,
      notes=coalesce(p_notes,notes) where id=deposit_row.id;
  elsif p_refund<>0 or p_deduction<>0 then raise exception 'This lease has no deposit';
  end if;
  update public.leases set status='ended',end_date=p_end_date where id=p_lease_id;
  update public.rooms set status='available' where id=lease_row.room_id;
end $$;
revoke all on function public.end_lease(uuid,date,numeric,numeric,text) from public;
grant execute on function public.end_lease(uuid,date,numeric,numeric,text) to authenticated;

create or replace function public.generate_invoice(
  p_lease_id uuid, p_period_start date, p_period_end date, p_due_date date
) returns uuid language plpgsql security definer set search_path=public,auth as $$
declare lease_row public.leases%rowtype; room_property uuid; bill_id uuid; bill_no text; prev_read numeric; close_read numeric; unit_price numeric; fee numeric; units numeric; utility_name text;
begin
  if p_period_end<p_period_start or p_due_date<p_period_start then raise exception 'Invalid billing period'; end if;
  select * into lease_row from public.leases where id=p_lease_id for update;
  if not found then raise exception 'Lease not found'; end if;
  if not public.has_org_role(lease_row.organization_id,array['owner','manager','accountant']::public.member_role[]) then raise exception 'Permission denied'; end if;
  select property_id into room_property from public.rooms where id=lease_row.room_id and organization_id=lease_row.organization_id;
  bill_no := 'BD-'||to_char(p_period_start,'YYYYMM')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
  insert into public.invoices(organization_id,tenant_id,lease_id,invoice_number,period_start,period_end,due_date,status)
  values(lease_row.organization_id,lease_row.tenant_id,lease_row.id,bill_no,p_period_start,p_period_end,p_due_date,'draft')
  on conflict(lease_id,period_start,period_end) do nothing returning id into bill_id;
  if bill_id is null then raise exception 'An invoice already exists for this lease and period'; end if;
  insert into public.invoice_items(organization_id,invoice_id,description,quantity,unit_price,amount)
  values(lease_row.organization_id,bill_id,'ค่าเช่าห้อง',1,lease_row.rent_amount,lease_row.rent_amount);
  foreach utility_name in array array['water','electricity'] loop
    select reading_value into prev_read from public.meter_readings where organization_id=lease_row.organization_id and room_id=lease_row.room_id and utility=utility_name and read_at<p_period_start order by read_at desc limit 1;
    select reading_value into close_read from public.meter_readings where organization_id=lease_row.organization_id and room_id=lease_row.room_id and utility=utility_name and read_at between p_period_start and p_period_end order by read_at desc limit 1;
    select unit_rate,fixed_fee into unit_price,fee from public.utility_rates where organization_id=lease_row.organization_id and property_id=room_property and utility=utility_name and effective_from<=p_period_end and coalesce(effective_to,'infinity'::date)>=p_period_start order by effective_from desc limit 1;
    if prev_read is not null and close_read is not null and unit_price is not null then
      if close_read<prev_read then raise exception 'Meter reading cannot be lower than the previous reading'; end if;
      units:=close_read-prev_read;
      insert into public.invoice_items(organization_id,invoice_id,description,quantity,unit_price,amount,metadata)
      values(lease_row.organization_id,bill_id,case when utility_name='water' then 'ค่าน้ำ' else 'ค่าไฟฟ้า' end,units,unit_price,round(units*unit_price+fee,2),jsonb_build_object('units',units,'fixed_fee',fee));
    end if;
    prev_read:=null; close_read:=null; unit_price:=null; fee:=null;
  end loop;
  update public.invoices set subtotal=(select sum(amount) from public.invoice_items where invoice_id=bill_id), total=(select sum(amount) from public.invoice_items where invoice_id=bill_id) where id=bill_id;
  return bill_id;
end $$;
revoke all on function public.generate_invoice(uuid,date,date,date) from public;
grant execute on function public.generate_invoice(uuid,date,date,date) to authenticated;

create or replace function public.finalize_invoice(p_invoice_id uuid) returns void
language plpgsql security definer set search_path=public,auth as $$
declare invoice_row public.invoices%rowtype;
begin
  select * into invoice_row from public.invoices where id=p_invoice_id for update;
  if not found then raise exception 'Invoice not found'; end if;
  if not public.has_org_role(invoice_row.organization_id,array['owner','manager','accountant']::public.member_role[]) then raise exception 'Permission denied'; end if;
  if invoice_row.status<>'draft' then raise exception 'Invoice is not a draft'; end if;
  update public.invoices set status='issued' where id=p_invoice_id;
end $$;
revoke all on function public.finalize_invoice(uuid) from public;
grant execute on function public.finalize_invoice(uuid) to authenticated;

create or replace function public.record_invoice_payment(
  p_invoice_id uuid, p_amount numeric, p_method public.payment_method, p_reference text default null
) returns uuid language plpgsql security definer set search_path=public,auth as $$
declare invoice_row public.invoices%rowtype; paid_total numeric; payment_id uuid;
begin
  select * into invoice_row from public.invoices where id=p_invoice_id for update;
  if not found then raise exception 'Invoice not found'; end if;
  if not public.has_org_role(invoice_row.organization_id,array['owner','manager','accountant']::public.member_role[]) then raise exception 'Permission denied'; end if;
  if invoice_row.status in ('draft','void') then raise exception 'Invoice cannot receive payments'; end if;
  if p_amount<=0 then raise exception 'Payment must be positive'; end if;
  select coalesce(sum(amount),0) into paid_total from public.payments where invoice_id=p_invoice_id;
  if p_amount>invoice_row.total-paid_total then raise exception 'Payment exceeds outstanding balance'; end if;
  insert into public.payments(organization_id,invoice_id,amount,method,reference,received_by)
  values(invoice_row.organization_id,p_invoice_id,p_amount,p_method,p_reference,auth.uid()) returning id into payment_id;
  paid_total:=paid_total+p_amount;
  update public.invoices set status=case when paid_total>=total then 'paid'::public.invoice_status else 'partial'::public.invoice_status end where id=p_invoice_id;
  return payment_id;
end $$;
revoke all on function public.record_invoice_payment(uuid,numeric,public.payment_method,text) from public;
grant execute on function public.record_invoice_payment(uuid,numeric,public.payment_method,text) to authenticated;

-- Restrict high-impact records to transactional functions and append-only workflows.
drop policy rooms_org_access on public.rooms;
create policy rooms_staff_read on public.rooms for select to authenticated using(public.is_staff_member(organization_id));
create policy rooms_managers_manage on public.rooms for all to authenticated using(public.has_org_role(organization_id,array['owner','manager']::public.member_role[])) with check(public.has_org_role(organization_id,array['owner','manager']::public.member_role[]));
drop policy utility_rates_org_access on public.utility_rates;
create policy utility_rates_staff_read on public.utility_rates for select to authenticated using(public.is_staff_member(organization_id));
create policy utility_rates_finance_manage on public.utility_rates for all to authenticated using(public.has_org_role(organization_id,array['owner','manager','accountant']::public.member_role[])) with check(public.has_org_role(organization_id,array['owner','manager','accountant']::public.member_role[]));
drop policy leases_org_access on public.leases;
create policy leases_staff_read on public.leases for select to authenticated using(public.is_staff_member(organization_id));
drop policy meter_readings_org_access on public.meter_readings;
create policy meter_readings_staff_read on public.meter_readings for select to authenticated using(public.is_staff_member(organization_id));
create policy meter_readings_staff_add on public.meter_readings for insert to authenticated with check(public.is_staff_member(organization_id));
create policy meter_readings_staff_correct on public.meter_readings for update to authenticated using(public.is_staff_member(organization_id)) with check(public.is_staff_member(organization_id));
drop policy invoices_staff_read on public.invoices;
create policy invoices_staff_read on public.invoices for select to authenticated using(public.is_staff_member(organization_id));
drop policy invoices_finance_manage on public.invoices;
drop policy invoice_items_staff_read on public.invoice_items;
create policy invoice_items_staff_read on public.invoice_items for select to authenticated using(public.is_staff_member(organization_id));
drop policy invoice_items_finance_manage on public.invoice_items;
drop policy payments_staff_read on public.payments;
create policy payments_staff_read on public.payments for select to authenticated using(public.is_staff_member(organization_id));
drop policy payments_finance_manage on public.payments;

create or replace function public.guard_meter_reading_order() returns trigger
language plpgsql set search_path=public as $$
declare prior_value numeric; next_value numeric;
begin
  perform pg_advisory_xact_lock(hashtext(new.room_id::text),hashtext(new.utility));
  select reading_value into prior_value from public.meter_readings where room_id=new.room_id and utility=new.utility and read_at<new.read_at and id<>new.id order by read_at desc limit 1;
  select reading_value into next_value from public.meter_readings where room_id=new.room_id and utility=new.utility and read_at>new.read_at and id<>new.id order by read_at limit 1;
  if prior_value is not null and new.reading_value<prior_value then raise exception 'Meter reading cannot be lower than the previous reading'; end if;
  if next_value is not null and new.reading_value>next_value then raise exception 'Meter reading cannot exceed a later reading'; end if;
  return new;
end $$;
create trigger meter_readings_order_guard before insert or update on public.meter_readings for each row execute function public.guard_meter_reading_order();
create trigger meter_readings_audit after insert or update or delete on public.meter_readings for each row execute function public.audit_row_change();

create or replace function public.guard_room_occupancy() returns trigger
language plpgsql set search_path=public as $$
begin
  if new.status='occupied' and not exists(select 1 from public.leases where room_id=new.id and organization_id=new.organization_id and status='active') then raise exception 'Occupied rooms require an active lease'; end if;
  if new.status<>'occupied' and exists(select 1 from public.leases where room_id=new.id and organization_id=new.organization_id and status='active') then raise exception 'End the active lease before changing room status'; end if;
  return new;
end $$;
create trigger rooms_occupancy_guard before insert or update of status on public.rooms for each row execute function public.guard_room_occupancy();
