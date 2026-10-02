-- Corrections to 20261001000006_data_consistency.sql.
--
-- 1. table_sessions_table_branch_unique made (table_id, branch_id) unique,
--    i.e. a table could only ever have ONE session in its lifetime: after the
--    first bill was paid, no new session (and so no new order) could be
--    opened on that table. The composite FK table_sessions -> restaurant_tables
--    only needs restaurant_tables (id, branch_id) to be unique, which it is.
--    "One active session per table" is already enforced by
--    table_sessions_one_active_idx (status <> 'closed'); the stricter
--    status = 'open' index added alongside it is redundant.
--
-- 2. Composite tenant FKs declared `on delete set null` null out EVERY
--    referencing column, including NOT NULL ones (restaurant_id, item_id,
--    branch_id), so deleting a customer, coupon, variant, branch, bill,
--    order or table session raised a not-null violation instead of
--    detaching the row. Postgres 15+ lets us null out only the nullable
--    reference column.

alter table table_sessions drop constraint if exists table_sessions_table_branch_unique;
drop index if exists table_sessions_one_open_per_table_idx;

-- staff.branch_id -> branches
alter table staff drop constraint if exists staff_branch_restaurant_fk;
alter table staff
  add constraint staff_branch_restaurant_fk
  foreign key (branch_id, restaurant_id)
  references branches(id, restaurant_id)
  on delete set null (branch_id);

-- orders.customer_id -> customers
alter table orders drop constraint if exists orders_customer_restaurant_fk;
alter table orders
  add constraint orders_customer_restaurant_fk
  foreign key (customer_id, restaurant_id)
  references customers(id, restaurant_id)
  on delete set null (customer_id);

-- orders.coupon_id -> coupons
alter table orders drop constraint if exists orders_coupon_restaurant_fk;
alter table orders
  add constraint orders_coupon_restaurant_fk
  foreign key (coupon_id, restaurant_id)
  references coupons(id, restaurant_id)
  on delete set null (coupon_id);

-- orders.table_session_id -> table_sessions
alter table orders drop constraint if exists orders_session_branch_fk;
alter table orders
  add constraint orders_session_branch_fk
  foreign key (table_session_id, branch_id)
  references table_sessions(id, branch_id)
  on delete set null (table_session_id);

-- order_items.variant_id -> menu_variants
alter table order_items drop constraint if exists order_items_variant_item_fk;
alter table order_items
  add constraint order_items_variant_item_fk
  foreign key (variant_id, item_id)
  references menu_variants(id, item_id)
  on delete set null (variant_id);

-- payments.bill_id -> bills
alter table payments drop constraint if exists payments_bill_restaurant_fk;
alter table payments
  add constraint payments_bill_restaurant_fk
  foreign key (bill_id, restaurant_id)
  references bills(id, restaurant_id)
  on delete set null (bill_id);

-- payments.order_id -> orders
alter table payments drop constraint if exists payments_order_restaurant_fk;
alter table payments
  add constraint payments_order_restaurant_fk
  foreign key (order_id, restaurant_id)
  references orders(id, restaurant_id)
  on delete set null (order_id);

-- feedback.order_id -> orders
alter table feedback drop constraint if exists feedback_order_restaurant_fk;
alter table feedback
  add constraint feedback_order_restaurant_fk
  foreign key (order_id, restaurant_id)
  references orders(id, restaurant_id)
  on delete set null (order_id);
