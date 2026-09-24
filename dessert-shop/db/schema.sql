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
