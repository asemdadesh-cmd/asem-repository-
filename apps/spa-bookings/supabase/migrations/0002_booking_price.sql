-- =============================================================================
-- Booking price
-- -----------------------------------------------------------------------------
-- Records the price agreed with the guest for the slot, and who agreed it.
-- Stored in pence as an integer: money must never be a float.
-- Hours are not stored — they are derived from starts_at/ends_at, which are
-- already the source of truth for the slot.
-- =============================================================================

alter table public.bookings
  add column if not exists price_pence   integer,
  add column if not exists price_set_by  uuid references public.profiles (id) on delete set null,
  add column if not exists price_set_at  timestamptz;

do $$ begin
  alter table public.bookings
    add constraint bookings_price_sane
    check (price_pence is null or (price_pence >= 0 and price_pence <= 10000000));
exception when duplicate_object then null; end $$;

comment on column public.bookings.price_pence is
  'Total agreed price for the slot, in pence. NULL means no price agreed yet.';
