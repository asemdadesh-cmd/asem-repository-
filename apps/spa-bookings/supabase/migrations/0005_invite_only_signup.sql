-- =============================================================================
-- Invite-only self sign-in
-- -----------------------------------------------------------------------------
-- Before: accounts had to be created up front (Supabase Admin API or dashboard
-- invite) and the login form used shouldCreateUser:false. The very first user
-- in an empty workspace became admin automatically.
--
-- After: being on staff_invites is all it takes. An invited person types their
-- email on the login screen and their account is created on first sign-in.
-- The allowlist check in this trigger is the security boundary, so the
-- "first user becomes admin" bootstrap is removed — with open sign-in it would
-- hand admin to whoever reached the page first. The first admin is seeded as a
-- staff_invites row instead.
-- =============================================================================

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  invite public.staff_invites%rowtype;
begin
  select * into invite from public.staff_invites
   where lower(email) = lower(new.email);

  if invite.email is null then
    raise exception 'Email % has not been invited to this workspace', new.email
      using errcode = 'insufficient_privilege';
  end if;

  update public.staff_invites set claimed_at = now() where email = invite.email;

  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email,
          coalesce(nullif(invite.full_name, ''), new.raw_user_meta_data ->> 'full_name', ''),
          invite.role)
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

-- First admin. Change the email before running this on another environment.
insert into public.staff_invites (email, role, full_name)
values ('info@nhtestates.co.uk', 'admin', 'Asem')
on conflict (email) do update set role = 'admin';
