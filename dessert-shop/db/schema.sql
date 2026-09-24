-- Dessert shop ledger schema. Idempotent: safe to run more than once.
-- Balance model: a customer's balance for a product = SUM(take) - SUM(return).

create table if not exists customers (
  id          bigint generated always as identity primary key,
  name        text not null check (char_length(btrim(name)) between 1 and 80),
  phone       text not null default '' check (char_length(phone) <= 20),
  created_at  timestamptz not null default now()
);

create table if not exists products (
  id          bigint generated always as identity primary key,
  name        text not null check (char_length(btrim(name)) between 1 and 60),
  created_at  timestamptz not null default now()
);
create unique index if not exists products_name_unique on products (lower(btrim(name)));

create table if not exists transactions (
  id           bigint generated always as identity primary key,
  customer_id  bigint not null references customers(id) on delete cascade,
  product_id   bigint not null references products(id) on delete restrict,
  kind         text not null check (kind in ('take', 'return')),
  quantity     integer not null check (quantity between 1 and 1000),
  note         text not null default '' check (char_length(note) <= 200),
  occurred_at  timestamptz not null default now(),
  created_at   timestamptz not null default now()
);
create index if not exists transactions_customer_idx on transactions (customer_id, occurred_at desc);
create index if not exists transactions_product_idx on transactions (product_id);

-- Failed login attempts, used to throttle password guessing.
create table if not exists login_attempts (
  id          bigint generated always as identity primary key,
  ip          text not null,
  created_at  timestamptz not null default now()
);
create index if not exists login_attempts_ip_idx on login_attempts (ip, created_at);

-- ---------- v2: prices, settings, reminders, push notifications ----------

-- Prices are stored in minor units (pence/cents) to avoid floating-point money.
alter table products add column if not exists price_cents integer not null default 0 check (price_cents between 0 and 10000000);
-- Price per tray at the time of the transaction, so later price changes never rewrite history.
alter table transactions add column if not exists unit_price_cents integer not null default 0 check (unit_price_cents between 0 and 10000000);

create table if not exists settings (
  id                 integer primary key default 1 check (id = 1),
  shop_name          text not null default 'محل الحلويات' check (char_length(btrim(shop_name)) between 1 and 60),
  currency           text not null default 'GBP' check (currency ~ '^[A-Z]{3}$'),
  overdue_days       integer not null default 7 check (overdue_days between 1 and 90),
  -- 0 = Sunday … 6 = Saturday, in the app timezone.
  reminder_weekday   integer not null default 6 check (reminder_weekday between 0 and 6),
  reminders_enabled  boolean not null default true,
  last_weekly_sent   date
);
insert into settings (id) values (1) on conflict do nothing;

-- Country code used to turn local numbers (07…) into WhatsApp links (+44 7…).
alter table settings add column if not exists country_code text not null default '44' check (country_code ~ '^[0-9]{1,4}$');

-- Browsers/phones that receive the weekly push notification.
create table if not exists push_subscriptions (
  id          bigint generated always as identity primary key,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  user_agent  text not null default '',
  created_at  timestamptz not null default now()
);

-- When the owner last sent a WhatsApp reminder to a customer.
create table if not exists reminder_log (
  id           bigint generated always as identity primary key,
  customer_id  bigint not null references customers(id) on delete cascade,
  sent_at      timestamptz not null default now()
);
create index if not exists reminder_log_customer_idx on reminder_log (customer_id, sent_at desc);

-- Outstanding trays per "take", first-in-first-out: returns settle the oldest takes first.
-- A take's `outstanding` is how many of its trays are still with the customer; value them at
-- that take's unit price, and the oldest take with outstanding > 0 says how long they've been out.
create or replace view take_outstanding with (security_invoker = true) as
with ret as (
  select customer_id, product_id, sum(quantity) as returned
  from transactions where kind = 'return'
  group by customer_id, product_id
), takes as (
  select t.id, t.customer_id, t.product_id, t.occurred_at, t.quantity, t.unit_price_cents,
         sum(t.quantity) over (partition by t.customer_id, t.product_id order by t.occurred_at, t.id) as cum
  from transactions t where t.kind = 'take'
)
select tk.id, tk.customer_id, tk.product_id, tk.occurred_at, tk.unit_price_cents,
       greatest(0, least(tk.quantity, tk.cum - coalesce(r.returned, 0)))::int as outstanding
from takes tk
left join ret r on r.customer_id = tk.customer_id and r.product_id = tk.product_id;
