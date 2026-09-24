-- Supabase-only: lock tables away from the public Data API (anon/authenticated) and create a
-- least-privilege login role the app uses through the connection pooler.
-- Run once (replace the password):  create role shop_app login password '<strong password>';
alter table customers enable row level security;
alter table products enable row level security;
alter table transactions enable row level security;
alter table login_attempts enable row level security;
revoke all on customers, products, transactions, login_attempts from anon, authenticated;

grant usage on schema public to shop_app;
grant select, insert, update, delete on customers, products, transactions, login_attempts to shop_app;

-- RLS is on with no policies for anon/authenticated (=> no access); shop_app gets full access.
drop policy if exists shop_app_all on customers;
drop policy if exists shop_app_all on products;
drop policy if exists shop_app_all on transactions;
drop policy if exists shop_app_all on login_attempts;
create policy shop_app_all on customers for all to shop_app using (true) with check (true);
create policy shop_app_all on products for all to shop_app using (true) with check (true);
create policy shop_app_all on transactions for all to shop_app using (true) with check (true);
create policy shop_app_all on login_attempts for all to shop_app using (true) with check (true);
