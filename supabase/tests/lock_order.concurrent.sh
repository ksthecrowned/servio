#!/usr/bin/env bash
# Concurrency regression test: a guest placing an order on a table while the
# cashier pays that table's bill must not deadlock (both functions lock the
# table row before the bill). Single-connection SQL tests can't see this.
#
# Usage: lock_order.concurrent.sh <database url>   (run by scripts/db-verify.sh
# against a throwaway copy of the verified database)
set -euo pipefail

db="$1"
psql_run() { psql "$db" -X -q -v ON_ERROR_STOP=1 "$@"; }

psql_run -o /dev/null <<'SQL'
insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000c1');
insert into restaurants (id, owner_id, slug, name) values ('10000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c1', 'lock-order', 'R');
insert into branches (id, restaurant_id, slug, name) values ('20000000-0000-0000-0000-0000000000c1', '10000000-0000-0000-0000-0000000000c1', 'main', 'Main');
insert into restaurant_tables (id, branch_id, label) values ('30000000-0000-0000-0000-0000000000c1', '20000000-0000-0000-0000-0000000000c1', 'T1');
insert into menu_categories (id, restaurant_id, name) values ('50000000-0000-0000-0000-0000000000c1', '10000000-0000-0000-0000-0000000000c1', 'C');
insert into menu_items (id, restaurant_id, category_id, name, base_price) values ('60000000-0000-0000-0000-0000000000c1', '10000000-0000-0000-0000-0000000000c1', '50000000-0000-0000-0000-0000000000c1', 'Poulet', 4500);
insert into staff (id, restaurant_id, name, role, pin_hash) values ('72000000-0000-0000-0000-0000000000c1', '10000000-0000-0000-0000-0000000000c1', 'Caisse', 'cashier', 'x');
select place_order('lock-order', 'main', '[{"item_id": "60000000-0000-0000-0000-0000000000c1", "quantity": 1}]', p_table_id => '30000000-0000-0000-0000-0000000000c1');
insert into bills (id, restaurant_id, branch_id, table_session_id, status, total_amount)
  select '90000000-0000-0000-0000-0000000000c1', restaurant_id, branch_id, table_session_id, 'requested', total_amount
  from orders where restaurant_id = '10000000-0000-0000-0000-0000000000c1';
SQL

# The guest's order holds the table row (place_order's first lock) while the
# cashier's payment starts, then carries on and updates the bill.
order_log=$(mktemp)
psql_run > "$order_log" 2>&1 <<'SQL' &
begin;
select 1 from restaurant_tables where id = '30000000-0000-0000-0000-0000000000c1' for update;
select pg_sleep(2);
select place_order('lock-order', 'main', '[{"item_id": "60000000-0000-0000-0000-0000000000c1", "quantity": 1}]', p_table_id => '30000000-0000-0000-0000-0000000000c1');
commit;
SQL
order_pid=$!
sleep 0.5
payment_status=0
payment_out=$(psql_run -c "select mark_bill_paid('90000000-0000-0000-0000-0000000000c1', '10000000-0000-0000-0000-0000000000c1', '72000000-0000-0000-0000-0000000000c1', 'cash')" 2>&1) || payment_status=$?
order_status=0
wait "$order_pid" || order_status=$?

if [ "$order_status" -ne 0 ] || [ "$payment_status" -ne 0 ]; then
  echo "concurrent order + payment failed:" >&2
  cat "$order_log" >&2
  echo "$payment_out" >&2
  exit 1
fi

# The payment waited for the order and charged both.
result=$(psql_run -At -c "select (select sum(amount) from payments where restaurant_id = '10000000-0000-0000-0000-0000000000c1') || '|' || (select string_agg(distinct status::text, ',') from orders where restaurant_id = '10000000-0000-0000-0000-0000000000c1')")
if [ "$result" != "9000.00|completed" ]; then
  echo "expected the payment to cover both orders (9000.00|completed), got: $result" >&2
  exit 1
fi
