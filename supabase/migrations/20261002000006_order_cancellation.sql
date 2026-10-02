-- Order cancellation.
--
-- The "cancelled" status existed but nothing could set it, so a mistaken
-- order stayed on the bill. cancel_order cancels in one transaction:
-- status + reason + history, the coupon use is given back, the open bill is
-- re-totalled and the table no longer shows a pending order.
--
-- Served or completed orders cannot be cancelled. With p_only_pending
-- (guests), only an order the kitchen hasn't accepted yet can be.
--
-- Callable by service_role only; server actions check who is asking (owner,
-- kitchen staff, or the guest holding the order link).

alter table orders add column cancel_reason text;

create or replace function public.cancel_order(
  p_order_id uuid,
  p_restaurant_id uuid,
  p_reason text default null,
  p_staff_id uuid default null,
  p_user_id uuid default null,
  p_only_pending boolean default false
)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_table_id uuid;
  v_order orders%rowtype;
begin
  -- Lock order: table, then order, then bill — the same as place_order and
  -- mark_bill_paid, so a cancellation can't deadlock with them.
  select ts.table_id into v_table_id
  from orders o
  left join table_sessions ts on ts.id = o.table_session_id
  where o.id = p_order_id and o.restaurant_id = p_restaurant_id;
  if not found then
    raise exception 'Commande introuvable.';
  end if;
  if v_table_id is not null then
    perform 1 from restaurant_tables where id = v_table_id for update;
  end if;

  select * into v_order from orders where id = p_order_id for update;

  if v_order.status = 'cancelled' then
    raise exception 'Cette commande est déjà annulée.';
  end if;
  if v_order.status in ('served', 'completed') then
    raise exception 'Cette commande a déjà été servie : elle ne peut plus être annulée.';
  end if;
  if p_only_pending and v_order.status <> 'pending' then
    raise exception 'La cuisine a déjà pris votre commande en charge : demandez à votre serveur.';
  end if;

  update orders
  set status = 'cancelled',
      cancel_reason = nullif(btrim(left(coalesce(p_reason, ''), 300)), '')
  where id = p_order_id;

  insert into order_status_history (order_id, status, changed_by, changed_by_staff_id)
  values (p_order_id, 'cancelled', p_user_id, p_staff_id);

  -- The coupon was counted when the order was placed: give the use back.
  if v_order.coupon_id is not null then
    update coupons set times_used = greatest(times_used - 1, 0) where id = v_order.coupon_id;
  end if;

  if v_order.table_session_id is not null then
    update bills b
    set total_amount = (
      select coalesce(sum(o.total_amount), 0)
      from orders o
      where o.table_session_id = v_order.table_session_id and o.status <> 'cancelled'
    )
    where b.table_session_id = v_order.table_session_id and b.status <> 'paid';

    -- Nothing left in the kitchen for this table: it is simply occupied.
    if not exists (
      select 1 from orders
      where table_session_id = v_order.table_session_id
        and status in ('pending', 'accepted', 'preparing', 'ready')
    ) then
      update restaurant_tables
      set status = 'occupied'
      where id = v_table_id and status in ('order_pending', 'preparing', 'ready');
    end if;
  end if;
end;
$$;

revoke execute on function public.cancel_order(uuid, uuid, text, uuid, uuid, boolean) from public, anon, authenticated;
grant execute on function public.cancel_order(uuid, uuid, text, uuid, uuid, boolean) to service_role;
