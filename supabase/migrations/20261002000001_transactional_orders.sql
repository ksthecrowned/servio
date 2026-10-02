-- Order placement and bill payment as single transactions.
--
-- Both flows used to be 5-10 separate PostgREST calls from server actions,
-- so a failure halfway left half-written state, and checks raced their
-- writes (coupon usage limit, double payment of a bill). Each is now one
-- function call: everything commits together or nothing does.
--
-- Called only from server actions through the service-role client.
-- Business-rule failures raise SQLSTATE P0001 with a message safe to show
-- to the user; anything else is an internal error.

-- ---------------------------------------------------------------------------
-- place_order
-- ---------------------------------------------------------------------------
--
-- p_lines: [{ "item_id": uuid, "variant_id": uuid | null,
--             "addon_ids": [uuid], "quantity": int,
--             "special_instructions": text }]
--
-- Prices, discount, tax and service charge are all computed here from the
-- database; nothing priced by the client is trusted.

create or replace function public.place_order(
  p_restaurant_slug text,
  p_branch_slug text,
  p_lines jsonb,
  p_table_id uuid default null,
  p_coupon_code text default null,
  p_customer_name text default null,
  p_customer_phone text default null
)
returns table (order_id uuid, order_number bigint)
language plpgsql
set search_path = public
as $$
#variable_conflict use_column
declare
  -- Offer dates are calendar days in the restaurant's market.
  local_today constant date := (now() at time zone 'Africa/Brazzaville')::date;

  v_restaurant restaurants%rowtype;
  v_branch_id uuid;
  v_table_id uuid;
  v_session_id uuid;
  v_customer_id uuid;
  v_coupon coupons%rowtype;
  v_offer offers%rowtype;

  v_line jsonb;
  v_lines jsonb := '[]'::jsonb;
  v_item_id uuid;
  v_item menu_items%rowtype;
  v_variant menu_variants%rowtype;
  v_variant_id uuid;
  v_quantity integer;
  v_unit_price numeric;
  v_addon_ids uuid[];
  v_addons jsonb;
  v_addons_total numeric;
  v_instructions text;

  v_subtotal numeric := 0;
  v_discount numeric := 0;
  v_taxable numeric;
  v_tax numeric;
  v_service numeric;
  v_order_id uuid;
  v_order_number bigint;
begin
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'Votre panier est vide.';
  end if;
  if jsonb_array_length(p_lines) > 100 then
    raise exception 'Trop d’articles dans une seule commande.';
  end if;

  select * into v_restaurant from restaurants where slug = p_restaurant_slug;
  if not found or v_restaurant.status <> 'active' then
    raise exception 'Restaurant introuvable.';
  end if;

  select id into v_branch_id
  from branches
  where restaurant_id = v_restaurant.id and slug = p_branch_slug and is_active;
  if not found then
    raise exception 'Succursale introuvable.';
  end if;

  if p_table_id is not null then
    -- Row lock serialises concurrent orders on the same table, so two
    -- guests ordering at once share one session instead of racing to
    -- open it.
    select id into v_table_id
    from restaurant_tables
    where id = p_table_id and branch_id = v_branch_id
    for update;
    if not found then
      raise exception 'Table introuvable.';
    end if;
  end if;

  -- Price every line from the database; the priced lines are inserted
  -- once the order row exists.
  for v_line in select value from jsonb_array_elements(p_lines) loop
    begin
      v_item_id := (v_line ->> 'item_id')::uuid;
      v_quantity := (v_line ->> 'quantity')::integer;
      v_variant_id := nullif(v_line ->> 'variant_id', '')::uuid;
      select coalesce(array_agg(distinct value::uuid), '{}')
        into v_addon_ids
        from jsonb_array_elements_text(coalesce(v_line -> 'addon_ids', '[]'::jsonb));
    exception when others then
      raise exception 'Panier invalide.';
    end;

    if v_quantity is null or v_quantity < 1 or v_quantity > 50 then
      raise exception 'Quantité invalide.';
    end if;

    select * into v_item
    from menu_items
    where id = v_item_id and restaurant_id = v_restaurant.id;
    if not found then
      raise exception 'Un des plats de votre panier n’est plus disponible.';
    end if;
    if not v_item.is_available then
      raise exception '« % » n’est plus disponible pour le moment.', v_item.name;
    end if;

    v_unit_price := v_item.base_price;
    v_variant := null;
    if v_variant_id is not null then
      select * into v_variant from menu_variants where id = v_variant_id and item_id = v_item.id;
      if not found then
        raise exception 'Variante invalide.';
      end if;
      v_unit_price := v_variant.price;
    end if;

    select
      coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'name', a.name, 'price', a.price) order by a.sort_order, a.name), '[]'::jsonb),
      coalesce(sum(a.price), 0)
    into v_addons, v_addons_total
    from menu_addons a
    where a.item_id = v_item.id and a.id = any (v_addon_ids);

    if jsonb_array_length(v_addons) <> cardinality(v_addon_ids) then
      raise exception 'Supplément invalide.';
    end if;

    v_instructions := nullif(left(btrim(coalesce(v_line ->> 'special_instructions', '')), 300), '');

    v_lines := v_lines || jsonb_build_object(
      'item_id', v_item.id,
      'variant_id', v_variant.id,
      'item_name', v_item.name,
      'variant_name', v_variant.name,
      'unit_price', v_unit_price,
      'quantity', v_quantity,
      'addon_selection', v_addons,
      'special_instructions', v_instructions
    );

    v_subtotal := v_subtotal + (v_unit_price + v_addons_total) * v_quantity;
  end loop;

  -- Coupon: locked so the usage-limit check and the increment cannot race.
  if nullif(btrim(coalesce(p_coupon_code, '')), '') is not null then
    select * into v_coupon
    from coupons
    where restaurant_id = v_restaurant.id and code = upper(btrim(p_coupon_code))
    for update;
    if not found or not v_coupon.is_active or v_coupon.offer_id is null then
      raise exception 'Code promo invalide.';
    end if;
    if v_coupon.usage_limit is not null and v_coupon.times_used >= v_coupon.usage_limit then
      raise exception 'Ce code promo a atteint sa limite d’utilisation.';
    end if;

    select * into v_offer from offers where id = v_coupon.offer_id;
    if not found or not v_offer.is_active
       or (v_offer.starts_on is not null and local_today < v_offer.starts_on)
       or (v_offer.ends_on is not null and local_today > v_offer.ends_on) then
      raise exception 'L’offre de ce code promo n’est plus active.';
    end if;
    if v_offer.min_order_value is not null and v_subtotal < v_offer.min_order_value then
      raise exception 'Ce code promo nécessite une commande d’au moins % FCFA.',
        to_char(v_offer.min_order_value, 'FM999G999G990');
    end if;

    if v_offer.type = 'percentage' and v_offer.percentage_value is not null then
      v_discount := v_subtotal * v_offer.percentage_value / 100;
    elsif v_offer.type = 'flat' and v_offer.flat_value is not null then
      v_discount := v_offer.flat_value;
    else
      -- bogo / combo / happy_hour have no pricing rules yet: refuse the
      -- coupon rather than accept it and silently give no discount.
      raise exception 'Ce code promo ne peut pas encore être utilisé pour une commande en ligne.';
    end if;

    if v_offer.max_discount_value is not null then
      v_discount := least(v_discount, v_offer.max_discount_value);
    end if;
    v_discount := round(least(v_discount, v_subtotal), 2);

    update coupons set times_used = times_used + 1 where id = v_coupon.id;
  end if;

  -- Every component is rounded once, and the total is their exact sum, so
  -- orders_total_matches_components holds by construction.
  v_subtotal := round(v_subtotal, 2);
  v_taxable := v_subtotal - v_discount;
  v_tax := round(v_taxable * v_restaurant.tax_percent / 100, 2);
  v_service := round(v_taxable * v_restaurant.service_charge_percent / 100, 2);

  if nullif(btrim(coalesce(p_customer_phone, '')), '') is not null then
    insert into customers (restaurant_id, phone, name)
    values (v_restaurant.id, btrim(p_customer_phone), nullif(btrim(coalesce(p_customer_name, '')), ''))
    on conflict (restaurant_id, phone)
      do update set name = coalesce(excluded.name, customers.name)
    returning id into v_customer_id;
  end if;

  if v_table_id is not null then
    -- Reuse whatever session is still active (open or bill_requested):
    -- guests may order again after asking for the bill.
    select id into v_session_id
    from table_sessions
    where table_id = v_table_id and status <> 'closed';

    if v_session_id is null then
      insert into table_sessions (table_id, branch_id)
      values (v_table_id, v_branch_id)
      returning id into v_session_id;
    end if;
  end if;

  insert into orders (
    restaurant_id, branch_id, table_session_id, customer_id, coupon_id,
    subtotal, discount_amount, tax_amount, service_charge_amount, total_amount
  )
  values (
    v_restaurant.id, v_branch_id, v_session_id, v_customer_id, v_coupon.id,
    v_subtotal, v_discount, v_tax, v_service, v_taxable + v_tax + v_service
  )
  returning id, order_number into v_order_id, v_order_number;

  insert into order_items (
    order_id, item_id, variant_id, item_name, variant_name,
    unit_price, quantity, addon_selection, special_instructions
  )
  select v_order_id, l.item_id, l.variant_id, l.item_name, l.variant_name,
         l.unit_price, l.quantity, l.addon_selection, l.special_instructions
  from jsonb_to_recordset(v_lines) as l (
    item_id uuid, variant_id uuid, item_name text, variant_name text,
    unit_price numeric, quantity integer, addon_selection jsonb, special_instructions text
  );

  insert into order_status_history (order_id, status) values (v_order_id, 'pending');

  if v_session_id is not null then
    update restaurant_tables set status = 'order_pending' where id = v_table_id;

    -- A bill already requested for this session must include the new order.
    update bills b
    set total_amount = (
      select coalesce(sum(o.total_amount), 0)
      from orders o
      where o.table_session_id = v_session_id and o.status <> 'cancelled'
    )
    where b.table_session_id = v_session_id and b.status <> 'paid';
  end if;

  return query select v_order_id, v_order_number;
end;
$$;

-- ---------------------------------------------------------------------------
-- mark_bill_paid
-- ---------------------------------------------------------------------------
--
-- Records the payment, completes every open order of the table session,
-- closes the session and frees the table. p_branch_id restricts the
-- cashier to their own branch (null = all branches of the restaurant).

create or replace function public.mark_bill_paid(
  p_bill_id uuid,
  p_restaurant_id uuid,
  p_staff_id uuid,
  p_method payment_method,
  p_branch_id uuid default null
)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_bill bills%rowtype;
  v_total numeric;
  v_table_id uuid;
begin
  if p_method not in ('cash', 'mobile_money', 'card') then
    raise exception 'Mode de paiement invalide.';
  end if;

  -- Row lock: a double click or two cashiers cannot both record a payment.
  select * into v_bill
  from bills
  where id = p_bill_id
    and restaurant_id = p_restaurant_id
    and (p_branch_id is null or branch_id = p_branch_id)
  for update;
  if not found then
    raise exception 'Addition introuvable.';
  end if;
  if v_bill.status = 'paid' then
    raise exception 'Cette addition a déjà été réglée.';
  end if;

  -- Charge what the session actually ordered, not a total captured when
  -- the bill was first requested.
  select coalesce(sum(total_amount), 0) into v_total
  from orders
  where table_session_id = v_bill.table_session_id and status <> 'cancelled';

  update bills
  set status = 'paid', total_amount = v_total, closed_at = now()
  where id = v_bill.id;

  if v_total > 0 then
    insert into payments (restaurant_id, bill_id, method, status, amount, recorded_by_staff_id)
    values (p_restaurant_id, v_bill.id, p_method, 'paid', v_total, p_staff_id);
  end if;

  with completed as (
    update orders
    set status = 'completed'
    where table_session_id = v_bill.table_session_id
      and status not in ('completed', 'cancelled')
    returning id
  )
  insert into order_status_history (order_id, status, changed_by_staff_id)
  select id, 'completed', p_staff_id from completed;

  update table_sessions
  set status = 'closed', closed_at = now()
  where id = v_bill.table_session_id
  returning table_id into v_table_id;

  update restaurant_tables set status = 'cleaning' where id = v_table_id;
end;
$$;

-- Server-side only: never callable by the anon/authenticated API roles.
revoke execute on function public.place_order(text, text, jsonb, uuid, text, text, text) from public, anon, authenticated;
revoke execute on function public.mark_bill_paid(uuid, uuid, uuid, payment_method, uuid) from public, anon, authenticated;
grant execute on function public.place_order(text, text, jsonb, uuid, text, text, text) to service_role;
grant execute on function public.mark_bill_paid(uuid, uuid, uuid, payment_method, uuid) to service_role;

-- Superseded by place_order, which increments inside its transaction.
drop function if exists public.increment_coupon_usage(uuid);
