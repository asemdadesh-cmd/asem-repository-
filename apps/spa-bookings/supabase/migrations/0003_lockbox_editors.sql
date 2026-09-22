-- =============================================================================
-- Let a named staff member change the lockbox code
-- -----------------------------------------------------------------------------
-- The person who physically rotates the code on the door is not necessarily an
-- admin, and making her one would hand over staff management and the whole
-- change history too. Instead: a single per-person permission an admin grants.
--
-- Admins can always change the code. Everyone signed in can still only SEE the
-- current code; the full history remains admin-only.
-- =============================================================================

alter table public.profiles
  add column if not exists can_edit_lockbox boolean not null default false;

comment on column public.profiles.can_edit_lockbox is
  'Lets a non-admin staff member record a new lockbox code. Granted by an admin.';

create or replace function public.can_edit_lockbox()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and is_active
      and (role = 'admin' or can_edit_lockbox)
  );
$$;

revoke all on function public.can_edit_lockbox() from public, anon;
grant execute on function public.can_edit_lockbox() to authenticated;

-- Writing a new code no longer requires the admin role.
drop policy if exists lockbox_admin_insert on public.lockbox_codes;
drop policy if exists lockbox_insert on public.lockbox_codes;
create policy lockbox_insert on public.lockbox_codes
  for insert to authenticated
  with check (public.can_edit_lockbox() and changed_by = auth.uid());

-- Reading the history stays admin-only (lockbox_admin_select is unchanged).

-- -----------------------------------------------------------------------------
-- The permission itself is admin-granted only. Without this, a staff member
-- could set their own can_edit_lockbox via the self-update policy on profiles.
-- -----------------------------------------------------------------------------
create or replace function public.guard_role_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if (new.role is distinct from old.role
      or new.is_active is distinct from old.is_active
      or new.can_edit_lockbox is distinct from old.can_edit_lockbox)
     and not public.is_admin() then
    raise exception 'Only admins can change role, active status or lockbox access'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;
