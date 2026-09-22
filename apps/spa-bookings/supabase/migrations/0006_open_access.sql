-- =============================================================================
-- Open access: no sign-in
-- -----------------------------------------------------------------------------
-- The owner chose to drop the login screen entirely. Anyone with the link can
-- use the app, including seeing and changing the lockbox code.
--
-- What still holds without accounts:
--   * Attribution: each phone picks a staff name once (stored on the device),
--     and every action records that name as text.
--   * Nothing is deletable: bookings are cancelled, never deleted; lockbox
--     history stays append-only (lockbox_immutable trigger).
--   * Push endpoints are write-only for the public key, via definer functions,
--     so the list of subscribed devices can't be read and spammed.
-- =============================================================================

-- Staff are now just names -----------------------------------------------------
create table if not exists public.staff_members (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  constraint staff_members_name_len check (char_length(trim(name)) between 1 and 60)
);
create unique index if not exists staff_members_name_key
  on public.staff_members (lower(name));

-- Name columns alongside the old account columns -------------------------------
alter table public.bookings
  add column if not exists created_by_name   text,
  add column if not exists confirmed_by_name text,
  add column if not exists cancelled_by_name text,
  add column if not exists spa_ready_by_name text,
  add column if not exists price_set_by_name text;

alter table public.lockbox_codes
  add column if not exists changed_by_name text;

alter table public.duty_shifts
  add column if not exists staff_name text,
  alter column user_id drop not null;

alter table public.push_subscriptions
  add column if not exists staff_name text,
  alter column user_id drop not null;

-- Current code no longer depends on a signed-in user ---------------------------
create or replace function public.current_lockbox_code()
returns table (code text, changed_at timestamptz)
language sql stable security definer
set search_path = public, pg_temp
as $$
  select l.code, l.created_at
  from public.lockbox_codes l
  order by l.created_at desc
  limit 1;
$$;
grant execute on function public.current_lockbox_code() to anon, authenticated;

-- Push subscriptions: write-only for the public key ----------------------------
create or replace function public.register_push(
  p_endpoint text, p_p256dh text, p_auth text, p_staff_name text, p_user_agent text
) returns void
language plpgsql security definer
set search_path = public, pg_temp
as $$
begin
  if p_endpoint is null or p_endpoint !~ '^https://' or char_length(p_endpoint) > 2048 then
    raise exception 'Invalid push endpoint';
  end if;
  insert into public.push_subscriptions (endpoint, p256dh, auth, staff_name, user_agent)
  values (p_endpoint, p_p256dh, p_auth, nullif(trim(p_staff_name), ''), left(p_user_agent, 300))
  on conflict (endpoint) do update
    set p256dh = excluded.p256dh,
        auth = excluded.auth,
        staff_name = excluded.staff_name,
        user_agent = excluded.user_agent;
end;
$$;

create or replace function public.unregister_push(p_endpoint text)
returns void
language sql security definer
set search_path = public, pg_temp
as $$
  delete from public.push_subscriptions where endpoint = p_endpoint;
$$;

revoke all on function public.register_push(text, text, text, text, text) from public;
revoke all on function public.unregister_push(text) from public;
grant execute on function public.register_push(text, text, text, text, text) to anon, authenticated;
grant execute on function public.unregister_push(text) to anon, authenticated;

-- Replace account-based policies with open ones --------------------------------
do $$
declare r record;
begin
  for r in
    select policyname, tablename from pg_policies
    where schemaname = 'public'
      and tablename in ('apartments','bookings','lockbox_codes','duty_shifts',
                        'push_subscriptions','staff_members')
  loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

alter table public.staff_members enable row level security;

-- staff names
create policy staff_read   on public.staff_members for select to anon, authenticated using (true);
create policy staff_add    on public.staff_members for insert to anon, authenticated with check (true);
create policy staff_edit   on public.staff_members for update to anon, authenticated using (true) with check (true);

-- apartments (hide, never delete)
create policy apt_read     on public.apartments for select to anon, authenticated using (true);
create policy apt_add      on public.apartments for insert to anon, authenticated with check (true);
create policy apt_edit     on public.apartments for update to anon, authenticated using (true) with check (true);

-- bookings (cancel, never delete)
create policy book_read    on public.bookings for select to anon, authenticated using (true);
create policy book_add     on public.bookings for insert to anon, authenticated with check (true);
create policy book_edit    on public.bookings for update to anon, authenticated using (true) with check (true);

-- lockbox (append-only; history readable so everyone sees who changed it)
create policy lock_read    on public.lockbox_codes for select to anon, authenticated using (true);
create policy lock_add     on public.lockbox_codes for insert to anon, authenticated with check (true);

-- duty rota (days can be cleared)
create policy duty_read    on public.duty_shifts for select to anon, authenticated using (true);
create policy duty_add     on public.duty_shifts for insert to anon, authenticated with check (true);
create policy duty_edit    on public.duty_shifts for update to anon, authenticated using (true) with check (true);
create policy duty_clear   on public.duty_shifts for delete to anon, authenticated using (true);

-- push_subscriptions: no policies at all -> only the definer functions and the
-- server's service-role key can touch them.

-- Seed the owner so the name list isn't empty on first open.
insert into public.staff_members (name) values ('Asem')
on conflict do nothing;
