-- =============================================================================
-- Close two findings from the Supabase security advisors
-- -----------------------------------------------------------------------------
-- 1. handle_new_user() and guard_role_change() are TRIGGER functions, but they
--    were still reachable as RPC endpoints (/rest/v1/rpc/...) by anon and
--    authenticated. Postgres refuses to run a trigger function called directly,
--    so this was not exploitable, but an unauthenticated caller should not be
--    able to reach a SECURITY DEFINER function at all.
--
-- 2. lockbox_immutable() and touch_updated_at() ran with a mutable search_path.
--    They are SECURITY INVOKER so the risk is low, but every function in this
--    schema should pin its search_path.
--
-- Deliberately NOT changed: is_admin(), is_staff(), can_edit_lockbox() and
-- current_lockbox_code() remain executable by `authenticated`. That is their
-- entire purpose — each one resolves auth.uid() internally and returns only
-- what that caller is entitled to.
--
-- Also left alone: btree_gist living in the public schema. The bookings overlap
-- constraint depends on it, and relocating an extension underneath a live
-- constraint risks more than the warning is worth.
-- =============================================================================

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.guard_role_change() from public, anon, authenticated;

create or replace function public.lockbox_immutable()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  raise exception 'Lockbox code history is append-only';
end;
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
