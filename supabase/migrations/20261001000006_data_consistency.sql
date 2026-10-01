-- Servio data consistency hardening.
--
-- Enforce tenant/branch relationships at the database level so a valid UUID
-- from another restaurant cannot be attached to an otherwise valid record.

-- ---------------------------------------------------------------------------
-- Branch/session hierarchy
-- ---------------------------------------------------------------------------

alter table table_sessions add column if not exists branch_id uuid;

update table_sessions ts
set branch_id = rt.branch_id
from restaurant_tables rt
where rt.id = ts.table_id
  and ts.branch_id is null;

alter table table_sessions
  alter column branch_id set not null;

alter table table_sessions
  add constraint table_sessions_branch_fk
  foreign key (branch_id) references branches(id) on delete cascade;

alter table table_sessions
  add constraint table_sessions_id_branch_unique
  unique (id, branch_id);

alter table table_sessions
  add constraint table_sessions_table_branch_unique
  unique (table_id, branch_id);

alter table table_sessions
  add constraint table_sessions_table_branch_fk
  foreign key (table_id, branch_id)
  references restaurant_tables(id, branch_id)
  on delete cascade;

alter table restaurant_tables
  add constraint restaurant_tables_id_branch_unique
  unique (id, branch_id);

alter table branches
  add constraint branches_id_restaurant_unique
  unique (id, restaurant_id);

-- ---------------------------------------------------------------------------
-- Menu hierarchy
-- ---------------------------------------------------------------------------

alter table menu_categories
  add constraint menu_categories_id_restaurant_unique
  unique (id, restaurant_id);

alter table menu_items
  add constraint menu_items_category_restaurant_fk
  foreign key (category_id, restaurant_id)
  references menu_categories(id, restaurant_id)
  on delete cascade;

alter table menu_variants
  add constraint menu_variants_id_item_unique
  unique (id, item_id);

alter table menu_addons
  add constraint menu_addons_id_item_unique
  unique (id, item_id);

-- ---------------------------------------------------------------------------
-- Staff / restaurant hierarchy
-- ---------------------------------------------------------------------------

alter table staff
  add constraint staff_branch_restaurant_fk
  foreign key (branch_id, restaurant_id)
  references branches(id, restaurant_id)
  on delete set null;

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------

alter table customers
  add constraint customers_id_restaurant_unique
  unique (id, restaurant_id);

alter table coupons
  add constraint coupons_id_restaurant_unique
  unique (id, restaurant_id);

alter table orders
  add constraint orders_branch_restaurant_fk
  foreign key (branch_id, restaurant_id)
  references branches(id, restaurant_id)
  on delete cascade;

alter table orders
  add constraint orders_customer_restaurant_fk
  foreign key (customer_id, restaurant_id)
  references customers(id, restaurant_id)
  on delete set null;

alter table orders
  add constraint orders_coupon_restaurant_fk
  foreign key (coupon_id, restaurant_id)
  references coupons(id, restaurant_id)
  on delete set null;

alter table orders
  add constraint orders_session_branch_fk
  foreign key (table_session_id, branch_id)
  references table_sessions(id, branch_id)
  on delete set null;

alter table orders
  add constraint orders_id_restaurant_unique
  unique (id, restaurant_id);

-- ---------------------------------------------------------------------------
-- Order items: preserve item/variant ownership
-- ---------------------------------------------------------------------------

alter table order_items
  add constraint order_items_variant_item_fk
  foreign key (variant_id, item_id)
  references menu_variants(id, item_id)
  on delete set null;

alter table order_items
  add constraint order_items_addon_selection_is_json
  check (jsonb_typeof(addon_selection) = 'array');

alter table order_items
  add constraint order_items_quantity_positive
  check (quantity > 0);

alter table order_items
  add constraint order_items_unit_price_nonnegative
  check (unit_price >= 0);

-- ---------------------------------------------------------------------------
-- Bills / payments
-- ---------------------------------------------------------------------------

alter table bills
  add constraint bills_id_restaurant_unique
  unique (id, restaurant_id);

alter table bills
  add constraint bills_branch_restaurant_fk
  foreign key (branch_id, restaurant_id)
  references branches(id, restaurant_id)
  on delete cascade;

alter table bills
  add constraint bills_session_branch_fk
  foreign key (table_session_id, branch_id)
  references table_sessions(id, branch_id)
  on delete cascade;

alter table bills
  add constraint bills_total_nonnegative
  check (total_amount >= 0);

alter table payments
  add constraint payments_bill_restaurant_fk
  foreign key (bill_id, restaurant_id)
  references bills(id, restaurant_id)
  on delete set null;

alter table payments
  add constraint payments_order_restaurant_fk
  foreign key (order_id, restaurant_id)
  references orders(id, restaurant_id)
  on delete set null;

alter table payments
  add constraint payments_amount_positive
  check (amount > 0);

-- ---------------------------------------------------------------------------
-- Waiter requests / notifications / QR
-- ---------------------------------------------------------------------------

alter table waiter_requests
  add constraint waiter_requests_table_branch_unique
  unique (id, branch_id);

alter table waiter_requests
  add constraint waiter_requests_table_branch_fk
  foreign key (table_id, branch_id)
  references restaurant_tables(id, branch_id)
  on delete cascade;

alter table notifications
  add constraint notifications_branch_restaurant_fk
  foreign key (branch_id, restaurant_id)
  references branches(id, restaurant_id)
  on delete cascade;

alter table qr_codes
  add constraint qr_codes_branch_restaurant_fk
  foreign key (branch_id, restaurant_id)
  references branches(id, restaurant_id)
  on delete cascade;

alter table qr_codes
  add constraint qr_codes_table_branch_fk
  foreign key (table_id, branch_id)
  references restaurant_tables(id, branch_id)
  on delete cascade;

-- ---------------------------------------------------------------------------
-- Feedback / loyalty
-- ---------------------------------------------------------------------------

alter table feedback
  add constraint feedback_order_restaurant_fk
  foreign key (order_id, restaurant_id)
  references orders(id, restaurant_id)
  on delete set null;

alter table feedback
  add constraint feedback_order_unique
  unique (order_id);

alter table customers
  add constraint customers_phone_not_blank
  check (phone is null or length(trim(phone)) > 0);

alter table loyalty_points
  add constraint loyalty_points_customer_restaurant_fk
  foreign key (customer_id, restaurant_id)
  references customers(id, restaurant_id)
  on delete cascade;

alter table loyalty_points
  add constraint loyalty_points_nonnegative
  check (points >= 0);

-- ---------------------------------------------------------------------------
-- Financial/order invariants
-- ---------------------------------------------------------------------------

alter table restaurants
  add constraint restaurants_tax_percent_valid
  check (tax_percent >= 0 and tax_percent <= 100);

alter table restaurants
  add constraint restaurants_service_charge_percent_valid
  check (service_charge_percent >= 0 and service_charge_percent <= 100);

alter table menu_items
  add constraint menu_items_price_nonnegative
  check (base_price >= 0);

alter table menu_variants
  add constraint menu_variants_price_nonnegative
  check (price >= 0);

alter table menu_addons
  add constraint menu_addons_price_nonnegative
  check (price >= 0);

alter table offers
  add constraint offers_percentage_valid
  check (percentage_value is null or (percentage_value >= 0 and percentage_value <= 100));

alter table offers
  add constraint offers_flat_value_nonnegative
  check (flat_value is null or flat_value >= 0);

alter table offers
  add constraint offers_discount_cap_nonnegative
  check (max_discount_value is null or max_discount_value >= 0);

alter table coupons
  add constraint coupons_usage_valid
  check (
    usage_limit is null
    or (usage_limit > 0 and times_used >= 0 and times_used <= usage_limit)
  );

alter table orders
  add constraint orders_amounts_nonnegative
  check (
    subtotal >= 0
    and discount_amount >= 0
    and tax_amount >= 0
    and service_charge_amount >= 0
    and total_amount >= 0
  );

alter table orders
  add constraint orders_discount_not_above_subtotal
  check (discount_amount <= subtotal);

alter table orders
  add constraint orders_total_matches_components
  check (
    total_amount = round(
      subtotal - discount_amount + tax_amount + service_charge_amount,
      2
    )
  );
