-- ════════════════════════════════════════════════════════════════════════
-- Water Shop Manager — initial schema
-- Money: bigint millimes (1 LYD = 1000). Financial records are append-only:
-- no UPDATE/DELETE is possible on transactions; corrections are reversal rows.
-- Client-generated UUID primary keys make offline sync idempotent.
-- ════════════════════════════════════════════════════════════════════════

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 120),
  timezone text not null default 'Africa/Tripoli',
  currency text not null default 'LYD',
  created_at timestamptz not null default now()
);

-- One row per app user. role allows employees later without schema changes.
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete restrict,
  role text not null default 'owner' check (role in ('owner', 'employee')),
  display_name text,
  created_at timestamptz not null default now()
);
create index on public.profiles (business_id);

create or replace function public.current_business_id()
returns uuid language sql stable security definer set search_path = public as $$
  select business_id from public.profiles where user_id = auth.uid()
$$;

create or replace function public.is_owner()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where user_id = auth.uid() and role = 'owner')
$$;

-- server_updated_at is the pull cursor (server clock, immune to device clock skew)
create or replace function public.touch_server_updated_at()
returns trigger language plpgsql as $$
begin new.server_updated_at := clock_timestamp(); return new; end $$;

create table public.categories (
  id uuid primary key,
  business_id uuid not null references public.businesses(id),
  name text not null check (length(name) between 1 and 80),
  sort int not null default 0,
  active boolean not null default true,
  updated_at timestamptz not null,
  server_updated_at timestamptz not null default now()
);
create index on public.categories (business_id, server_updated_at);

create table public.products (
  id uuid primary key,
  business_id uuid not null references public.businesses(id),
  category_id uuid not null references public.categories(id),
  name text not null check (length(name) between 1 and 80),
  price_m bigint not null check (price_m > 0),
  kind text not null check (kind in ('refill', 'product')),
  active boolean not null default true,
  sort int not null default 0,
  updated_at timestamptz not null,
  server_updated_at timestamptz not null default now()
);
create index on public.products (business_id, server_updated_at);

create table public.customers (
  id uuid primary key,
  business_id uuid not null references public.businesses(id),
  name text not null check (length(name) between 1 and 80),
  phone text check (phone ~ '^\+?[0-9]{7,15}$'),
  notes text check (length(notes) <= 1000),
  archived boolean not null default false,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  server_updated_at timestamptz not null default now()
);
create index on public.customers (business_id, server_updated_at);
create index on public.customers (business_id, name);

-- Unified financial ledger. sales_m / cash_m / debt_m are the txn's effects;
-- every balance and report is a SUM over these columns.
create table public.transactions (
  id uuid primary key,
  business_id uuid not null references public.businesses(id),
  type text not null check (type in ('sale', 'payment', 'expense', 'reversal')),
  created_at timestamptz not null,
  business_date date not null,
  customer_id uuid references public.customers(id),
  note text check (length(note) <= 500),
  total_m bigint,
  paid_m bigint,
  payment_mode text check (payment_mode in ('cash', 'credit', 'partial')),
  amount_m bigint,
  expense_category text check (expense_category in ('transport', 'electricity', 'supplies', 'other')),
  reverses_id uuid unique references public.transactions(id), -- unique ⇒ a txn can be reversed once
  reversed_type text check (reversed_type in ('sale', 'payment', 'expense')),
  reason text,
  sales_m bigint not null,
  cash_m bigint not null,
  debt_m bigint not null,
  created_by uuid not null default auth.uid() references auth.users(id),
  server_updated_at timestamptz not null default now(),
  -- shape rules per type
  constraint sale_shape check (type <> 'sale' or (
    total_m > 0 and paid_m between 0 and total_m and payment_mode is not null
    and sales_m = total_m and cash_m = paid_m and debt_m = total_m - paid_m
    and (payment_mode = 'cash' or customer_id is not null)
    and (payment_mode <> 'cash' or paid_m = total_m))),
  constraint payment_shape check (type <> 'payment' or (
    amount_m > 0 and customer_id is not null and sales_m = 0 and cash_m = amount_m and debt_m = -amount_m)),
  constraint expense_shape check (type <> 'expense' or (
    amount_m > 0 and expense_category is not null and sales_m = 0 and cash_m = -amount_m and debt_m = 0)),
  constraint reversal_shape check (type <> 'reversal' or (
    reverses_id is not null and reversed_type is not null and length(coalesce(reason, '')) > 0))
);
create index on public.transactions (business_id, business_date);
create index on public.transactions (business_id, customer_id, created_at);
create index on public.transactions (business_id, server_updated_at);

create table public.transaction_items (
  transaction_id uuid not null references public.transactions(id),
  line_no int not null,
  product_id uuid not null references public.products(id),
  name text not null,
  kind text not null check (kind in ('refill', 'product')),
  unit_price_m bigint not null check (unit_price_m > 0),
  qty int not null check (qty > 0),
  line_total_m bigint not null,
  primary key (transaction_id, line_no),
  check (line_total_m = unit_price_m * qty)
);

create table public.daily_closings (
  business_id uuid not null references public.businesses(id),
  business_date date not null,
  expected_cash_m bigint not null,
  counted_cash_m bigint not null check (counted_cash_m >= 0),
  difference_m bigint not null,
  note text,
  closed_at timestamptz not null,
  updated_at timestamptz not null,
  closed_by uuid default auth.uid() references auth.users(id),
  server_updated_at timestamptz not null default now(),
  primary key (business_id, business_date),
  check (difference_m = counted_cash_m - expected_cash_m)
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  business_id uuid not null references public.businesses(id),
  user_id uuid default auth.uid(),
  at timestamptz not null default now(),
  action text not null,
  entity text not null,
  entity_id text not null,
  before jsonb,
  after jsonb
);
create index on public.audit_logs (business_id, at desc);

-- Cursor triggers
create trigger t_touch before insert or update on public.categories for each row execute function public.touch_server_updated_at();
create trigger t_touch before insert or update on public.products for each row execute function public.touch_server_updated_at();
create trigger t_touch before insert or update on public.customers for each row execute function public.touch_server_updated_at();
create trigger t_touch before insert on public.transactions for each row execute function public.touch_server_updated_at();
create trigger t_touch before insert or update on public.daily_closings for each row execute function public.touch_server_updated_at();

-- Financial history is immutable — even for the table owner via the API.
create or replace function public.forbid_change()
returns trigger language plpgsql as $$
begin raise exception 'financial records are append-only; record a reversal instead'; end $$;
create trigger t_immutable before update or delete on public.transactions for each row execute function public.forbid_change();
create trigger t_immutable before update or delete on public.transaction_items for each row execute function public.forbid_change();
create trigger t_immutable before update or delete on public.audit_logs for each row execute function public.forbid_change();

-- Derived balances (security_invoker ⇒ RLS of the caller applies)
create view public.customer_balances with (security_invoker = true) as
  select c.id as customer_id, c.business_id, c.name,
         coalesce(sum(t.debt_m), 0)::bigint as balance_m
  from public.customers c
  left join public.transactions t on t.customer_id = c.id
  group by c.id;

-- ───────────────────────── Row Level Security ─────────────────────────
alter table public.businesses enable row level security;
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.customers enable row level security;
alter table public.transactions enable row level security;
alter table public.transaction_items enable row level security;
alter table public.daily_closings enable row level security;
alter table public.audit_logs enable row level security;

create policy "own business" on public.businesses for select using (id = public.current_business_id());
create policy "own profile" on public.profiles for select using (business_id = public.current_business_id());

create policy "read" on public.categories for select using (business_id = public.current_business_id());
create policy "read" on public.products for select using (business_id = public.current_business_id());
create policy "read" on public.customers for select using (business_id = public.current_business_id());
create policy "read" on public.transactions for select using (business_id = public.current_business_id());
create policy "read" on public.transaction_items for select using (
  exists (select 1 from public.transactions t where t.id = transaction_id and t.business_id = public.current_business_id()));
create policy "read" on public.daily_closings for select using (business_id = public.current_business_id());
create policy "owner reads" on public.audit_logs for select using (business_id = public.current_business_id() and public.is_owner());
-- No insert/update/delete policies: all writes go through the validated RPCs below.

-- ───────────────────────── RPCs ─────────────────────────

-- First login: create the business + owner profile (idempotent).
create or replace function public.bootstrap_owner(p_business_name text default 'محل المياه')
returns uuid language plpgsql security definer set search_path = public as $$
declare b uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select business_id into b from profiles where user_id = auth.uid();
  if b is not null then return b; end if;
  insert into businesses (name) values (p_business_name) returning id into b;
  insert into profiles (user_id, business_id, role) values (auth.uid(), b, 'owner');
  return b;
end $$;

-- Push one financial txn. Idempotent: re-sending the same id is a no-op.
create or replace function public.push_txn(p jsonb)
returns text language plpgsql security definer set search_path = public as $$
declare
  b uuid := current_business_id();
  v_id uuid := (p->>'id')::uuid;
  v_orig transactions;
  v_items_total bigint;
  v_balance bigint;
  it jsonb;
  n int := 0;
begin
  if b is null then raise exception 'no business for user'; end if;
  if exists (select 1 from transactions where id = v_id) then
    if exists (select 1 from transactions where id = v_id and business_id = b) then return 'duplicate'; end if;
    raise exception 'id conflict';
  end if;
  if p->>'customerId' is not null and not exists (
    select 1 from customers where id = (p->>'customerId')::uuid and business_id = b) then
    raise exception 'customer not found';
  end if;

  if p->>'type' = 'reversal' then
    select * into v_orig from transactions where id = (p->>'reversesId')::uuid and business_id = b;
    if v_orig.id is null then raise exception 'original txn not found'; end if;
    if v_orig.type = 'reversal' then raise exception 'cannot reverse a reversal'; end if;
    if (p->>'salesM')::bigint <> -v_orig.sales_m then raise exception 'reversal sales mismatch'; end if;
    if v_orig.type in ('payment', 'expense') and ((p->>'cashM')::bigint <> -v_orig.cash_m or (p->>'debtM')::bigint <> -v_orig.debt_m) then
      raise exception 'reversal amount mismatch';
    end if;
    if v_orig.type = 'sale' and not ((p->>'debtM')::bigint between -v_orig.debt_m and 0
       and (p->>'cashM')::bigint = -(v_orig.sales_m + (p->>'debtM')::bigint)) then
      raise exception 'reversal amount mismatch';
    end if;
  end if;

  insert into transactions (id, business_id, type, created_at, business_date, customer_id, note,
    total_m, paid_m, payment_mode, amount_m, expense_category, reverses_id, reversed_type, reason,
    sales_m, cash_m, debt_m)
  values (v_id, b, p->>'type', (p->>'createdAt')::timestamptz, (p->>'businessDate')::date,
    (p->>'customerId')::uuid, p->>'note', (p->>'totalM')::bigint, (p->>'paidM')::bigint, p->>'paymentMode',
    (p->>'amountM')::bigint, p->>'expenseCategory', (p->>'reversesId')::uuid, p->>'reversedType', p->>'reason',
    (p->>'salesM')::bigint, (p->>'cashM')::bigint, (p->>'debtM')::bigint);

  if p->>'type' = 'sale' then
    for it in select * from jsonb_array_elements(coalesce(p->'items', '[]'::jsonb)) loop
      n := n + 1;
      insert into transaction_items (transaction_id, line_no, product_id, name, kind, unit_price_m, qty, line_total_m)
      values (v_id, n, (it->>'productId')::uuid, it->>'name', it->>'kind', (it->>'unitPriceM')::bigint,
              (it->>'qty')::int, (it->>'lineTotalM')::bigint);
    end loop;
    select coalesce(sum(line_total_m), 0) into v_items_total from transaction_items where transaction_id = v_id;
    if n = 0 or v_items_total <> (p->>'totalM')::bigint then raise exception 'items do not match total'; end if;
  end if;

  -- A customer's debt can never go negative (no silent overpayment / credit balances).
  if p->>'customerId' is not null then
    select coalesce(sum(debt_m), 0) into v_balance from transactions where customer_id = (p->>'customerId')::uuid;
    if v_balance < 0 then raise exception 'payment exceeds outstanding debt'; end if;
  end if;
  return 'inserted';
end $$;

-- Upsert catalog / customer / closing rows. Last-write-wins on client updated_at.
create or replace function public.push_entity(p_kind text, p jsonb)
returns text language plpgsql security definer set search_path = public as $$
declare b uuid := current_business_id();
begin
  if b is null then raise exception 'no business for user'; end if;
  if p_kind = 'category' then
    insert into categories (id, business_id, name, sort, active, updated_at)
    values ((p->>'id')::uuid, b, p->>'name', (p->>'sort')::int, (p->>'active')::boolean, (p->>'updatedAt')::timestamptz)
    on conflict (id) do update set name = excluded.name, sort = excluded.sort, active = excluded.active, updated_at = excluded.updated_at
      where categories.business_id = b and categories.updated_at <= excluded.updated_at;
  elsif p_kind = 'product' then
    insert into products (id, business_id, category_id, name, price_m, kind, active, sort, updated_at)
    values ((p->>'id')::uuid, b, (p->>'categoryId')::uuid, p->>'name', (p->>'priceM')::bigint, p->>'kind',
            (p->>'active')::boolean, (p->>'sort')::int, (p->>'updatedAt')::timestamptz)
    on conflict (id) do update set category_id = excluded.category_id, name = excluded.name, price_m = excluded.price_m,
      kind = excluded.kind, active = excluded.active, sort = excluded.sort, updated_at = excluded.updated_at
      where products.business_id = b and products.updated_at <= excluded.updated_at;
  elsif p_kind = 'customer' then
    insert into customers (id, business_id, name, phone, notes, archived, created_at, updated_at)
    values ((p->>'id')::uuid, b, p->>'name', p->>'phone', p->>'notes', coalesce((p->>'archived')::boolean, false),
            (p->>'createdAt')::timestamptz, (p->>'updatedAt')::timestamptz)
    on conflict (id) do update set name = excluded.name, phone = excluded.phone, notes = excluded.notes,
      archived = excluded.archived, updated_at = excluded.updated_at
      where customers.business_id = b and customers.updated_at <= excluded.updated_at;
  elsif p_kind = 'closing' then
    insert into daily_closings (business_id, business_date, expected_cash_m, counted_cash_m, difference_m, note, closed_at, updated_at)
    values (b, (p->>'businessDate')::date, (p->>'expectedCashM')::bigint, (p->>'countedCashM')::bigint,
            (p->>'differenceM')::bigint, p->>'note', (p->>'closedAt')::timestamptz, (p->>'updatedAt')::timestamptz)
    on conflict (business_id, business_date) do update set expected_cash_m = excluded.expected_cash_m,
      counted_cash_m = excluded.counted_cash_m, difference_m = excluded.difference_m, note = excluded.note,
      updated_at = excluded.updated_at
      where daily_closings.updated_at <= excluded.updated_at;
  else
    raise exception 'unknown kind %', p_kind;
  end if;
  insert into audit_logs (business_id, action, entity, entity_id, after) values (b, 'push', p_kind, coalesce(p->>'id', p->>'businessDate'), p);
  return 'ok';
end $$;

revoke all on function public.push_txn(jsonb) from public, anon;
revoke all on function public.push_entity(text, jsonb) from public, anon;
revoke all on function public.bootstrap_owner(text) from public, anon;
grant execute on function public.push_txn(jsonb) to authenticated;
grant execute on function public.push_entity(text, jsonb) to authenticated;
grant execute on function public.bootstrap_owner(text) to authenticated;
