-- =============================================================================
-- Cardiff Spa Bookings — initial schema
-- Single property, single spa. Roles: admin | staff.
-- Run this once against a fresh Supabase project (SQL Editor, or `supabase db push`).
-- =============================================================================

create extension if not exists "btree_gist";      -- range exclusion constraint
create extension if not exists "pgcrypto";        -- gen_random_uuid()

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
do $$ begin
  create type public.user_role as enum ('admin', 'staff');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.booking_status as enum ('pending', 'confirmed', 'cancelled');
exception when duplicate_object then null; end $$;

-- -----------------------------------------------------------------------------
-- profiles — one row per auth user
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  full_name   text not null default '',
  phone       text,
  role        public.user_role not null default 'staff',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- staff_invites — allowlist. Only invited emails ever get a profile.
-- -----------------------------------------------------------------------------
create table if not exists public.staff_invites (
  email       text primary key,
  role        public.user_role not null default 'staff',
  full_name   text not null default '',
  invited_by  uuid references public.profiles (id) on delete set null,
  claimed_at  timestamptz,
  created_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Role helpers. SECURITY DEFINER so policies on `profiles` don't recurse.
-- -----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and is_active
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_active
  );
$$;

-- -----------------------------------------------------------------------------
-- New auth user -> profile, but only if the email was invited.
-- Bootstrap: the very first user ever created becomes admin.
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  invite    public.staff_invites%rowtype;
  new_role  public.user_role;
  new_name  text;
begin
  select * into invite from public.staff_invites
   where lower(email) = lower(new.email);

  if invite.email is null then
    if exists (select 1 from public.profiles) then
      raise exception 'Email % has not been invited to this workspace', new.email
        using errcode = 'insufficient_privilege';
    end if;
    -- First user in an empty workspace bootstraps as admin.
    new_role := 'admin';
    new_name := coalesce(new.raw_user_meta_data ->> 'full_name', '');
  else
    new_role := invite.role;
    new_name := coalesce(nullif(invite.full_name, ''),
                         new.raw_user_meta_data ->> 'full_name', '');
    update public.staff_invites set claimed_at = now()
     where email = invite.email;
  end if;

  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, new_name, new_role)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- apartments
-- -----------------------------------------------------------------------------
create table if not exists public.apartments (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  sort_order  int  not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);
create unique index if not exists apartments_name_key
  on public.apartments (lower(name));

-- -----------------------------------------------------------------------------
-- bookings — one shared spa, so no two live bookings may overlap
-- -----------------------------------------------------------------------------
create table if not exists public.bookings (
  id             uuid primary key default gen_random_uuid(),
  apartment_id   uuid not null references public.apartments (id) on delete restrict,
  guest_name     text not null,
  guest_contact  text,
  starts_at      timestamptz not null,
  ends_at        timestamptz not null,
  status         public.booking_status not null default 'pending',
  notes          text,

  created_by     uuid references public.profiles (id) on delete set null,
  confirmed_by   uuid references public.profiles (id) on delete set null,
  confirmed_at   timestamptz,
  cancelled_by   uuid references public.profiles (id) on delete set null,
  cancelled_at   timestamptz,
  cancel_reason  text,

  spa_ready_at   timestamptz,
  spa_ready_by   uuid references public.profiles (id) on delete set null,

  reminder_sent_at timestamptz,   -- T-60 switch-on nudge to the duty staffer
  escalated_at     timestamptz,   -- T-15 chase when the spa still isn't marked ready

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint bookings_time_order check (ends_at > starts_at),
  constraint bookings_max_duration check (ends_at - starts_at <= interval '6 hours'),
  constraint bookings_guest_name_len check (char_length(trim(guest_name)) between 1 and 120),
  constraint bookings_notes_len check (notes is null or char_length(notes) <= 1000),
  -- A cancelled booking frees its slot; everything else holds the spa exclusively.
  constraint bookings_no_overlap exclude using gist (
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status <> 'cancelled')
);

create index if not exists bookings_starts_at_idx on public.bookings (starts_at);
create index if not exists bookings_status_starts_idx on public.bookings (status, starts_at);

-- -----------------------------------------------------------------------------
-- lockbox_codes — append-only history. Newest row is the current code.
-- -----------------------------------------------------------------------------
create table if not exists public.lockbox_codes (
  id          uuid primary key default gen_random_uuid(),
  code        text not null,
  note        text,
  changed_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  constraint lockbox_code_len check (char_length(trim(code)) between 3 and 32),
  constraint lockbox_note_len check (note is null or char_length(note) <= 500)
);
create index if not exists lockbox_codes_created_idx
  on public.lockbox_codes (created_at desc);

-- History is immutable: no updates, no deletes, ever.
create or replace function public.lockbox_immutable()
returns trigger language plpgsql as $$
begin
  raise exception 'Lockbox code history is append-only';
end;
$$;
drop trigger if exists lockbox_no_update on public.lockbox_codes;
create trigger lockbox_no_update before update or delete on public.lockbox_codes
  for each row execute function public.lockbox_immutable();

-- Everyone signed in needs the current code; only admins may read the history.
create or replace function public.current_lockbox_code()
returns table (code text, changed_at timestamptz)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select l.code, l.created_at
  from public.lockbox_codes l
  where public.is_staff()
  order by l.created_at desc
  limit 1;
$$;

-- -----------------------------------------------------------------------------
-- duty_shifts — who is on duty on a given day (Europe/London calendar day)
-- -----------------------------------------------------------------------------
create table if not exists public.duty_shifts (
  id          uuid primary key default gen_random_uuid(),
  duty_date   date not null,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  assigned_by uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (duty_date)
);

-- -----------------------------------------------------------------------------
-- push_subscriptions — Web Push endpoints, one row per device
-- -----------------------------------------------------------------------------
create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);

-- -----------------------------------------------------------------------------
-- notifications — in-app feed, mirrors what went out over push
-- -----------------------------------------------------------------------------
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  kind        text not null,
  title       text not null,
  body        text not null,
  booking_id  uuid references public.bookings (id) on delete cascade,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

-- -----------------------------------------------------------------------------
-- updated_at maintenance
-- -----------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists bookings_touch on public.bookings;
create trigger bookings_touch before update on public.bookings
  for each row execute function public.touch_updated_at();

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- =============================================================================
-- Row Level Security
-- =============================================================================
alter table public.profiles           enable row level security;
alter table public.staff_invites      enable row level security;
alter table public.apartments         enable row level security;
alter table public.bookings           enable row level security;
alter table public.lockbox_codes      enable row level security;
alter table public.duty_shifts        enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.notifications      enable row level security;

-- profiles ---------------------------------------------------------------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated using (public.is_staff());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists profiles_admin_write on public.profiles;
create policy profiles_admin_write on public.profiles
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- A staff member must never be able to promote themselves to admin.
create or replace function public.guard_role_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if (new.role is distinct from old.role or new.is_active is distinct from old.is_active)
     and not public.is_admin() then
    raise exception 'Only admins can change role or active status'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;
drop trigger if exists profiles_guard_role on public.profiles;
create trigger profiles_guard_role before update on public.profiles
  for each row execute function public.guard_role_change();

-- staff_invites (admin only) ---------------------------------------------
drop policy if exists invites_admin_all on public.staff_invites;
create policy invites_admin_all on public.staff_invites
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- apartments --------------------------------------------------------------
drop policy if exists apartments_select on public.apartments;
create policy apartments_select on public.apartments
  for select to authenticated using (public.is_staff());

drop policy if exists apartments_admin_write on public.apartments;
create policy apartments_admin_write on public.apartments
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- bookings ----------------------------------------------------------------
drop policy if exists bookings_select on public.bookings;
create policy bookings_select on public.bookings
  for select to authenticated using (public.is_staff());

drop policy if exists bookings_insert on public.bookings;
create policy bookings_insert on public.bookings
  for insert to authenticated with check (public.is_staff());

drop policy if exists bookings_update on public.bookings;
create policy bookings_update on public.bookings
  for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

drop policy if exists bookings_admin_delete on public.bookings;
create policy bookings_admin_delete on public.bookings
  for delete to authenticated using (public.is_admin());

-- lockbox -----------------------------------------------------------------
-- Full history is admin-only. Staff read the current code via
-- public.current_lockbox_code(), which is SECURITY DEFINER.
drop policy if exists lockbox_admin_select on public.lockbox_codes;
create policy lockbox_admin_select on public.lockbox_codes
  for select to authenticated using (public.is_admin());

drop policy if exists lockbox_admin_insert on public.lockbox_codes;
create policy lockbox_admin_insert on public.lockbox_codes
  for insert to authenticated
  with check (public.is_admin() and changed_by = auth.uid());

-- duty --------------------------------------------------------------------
drop policy if exists duty_select on public.duty_shifts;
create policy duty_select on public.duty_shifts
  for select to authenticated using (public.is_staff());

drop policy if exists duty_admin_write on public.duty_shifts;
create policy duty_admin_write on public.duty_shifts
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Staff may claim an unclaimed day for themselves (self-service rota).
drop policy if exists duty_self_claim on public.duty_shifts;
create policy duty_self_claim on public.duty_shifts
  for insert to authenticated
  with check (public.is_staff() and user_id = auth.uid());

-- push subscriptions (own rows only) --------------------------------------
drop policy if exists push_own on public.push_subscriptions;
create policy push_own on public.push_subscriptions
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- notifications (own rows only; writes happen via service role) ------------
drop policy if exists notifications_own_select on public.notifications;
create policy notifications_own_select on public.notifications
  for select to authenticated using (user_id = auth.uid());

drop policy if exists notifications_own_update on public.notifications;
create policy notifications_own_update on public.notifications
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- Function grants
-- -----------------------------------------------------------------------------
revoke all on function public.current_lockbox_code() from public, anon;
grant execute on function public.current_lockbox_code() to authenticated;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
revoke all on function public.is_staff() from public, anon;
grant execute on function public.is_staff() to authenticated;

-- -----------------------------------------------------------------------------
-- Realtime (live calendar updates across phones)
-- -----------------------------------------------------------------------------
do $$ begin
  alter publication supabase_realtime add table public.bookings;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null; end $$;
