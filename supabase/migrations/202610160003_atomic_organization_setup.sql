create or replace function public.create_organization_with_property(
  p_name text,
  p_property_name text
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  actor_id uuid := auth.uid();
  new_organization_id uuid;
begin
  if actor_id is null then
    raise exception 'Authentication required';
  end if;

  if length(trim(coalesce(p_name, ''))) not between 2 and 120 then
    raise exception 'Organization name must be between 2 and 120 characters';
  end if;

  if length(trim(coalesce(p_property_name, ''))) not between 1 and 120 then
    raise exception 'Property name must be between 1 and 120 characters';
  end if;

  insert into public.organizations (name, owner_user_id)
  values (trim(p_name), actor_id)
  returning id into new_organization_id;

  insert into public.organization_members (organization_id, user_id, role)
  values (new_organization_id, actor_id, 'owner');

  insert into public.properties (organization_id, name)
  values (new_organization_id, trim(p_property_name));

  return new_organization_id;
end;
$$;

revoke all on function public.create_organization_with_property(text, text) from public;
grant execute on function public.create_organization_with_property(text, text) to authenticated;
