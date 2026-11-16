-- Run this ONCE in Supabase > SQL Editor.
-- It removes the date field (if you added it) and keeps only a note of max 125 characters.
-- Safe to run whether or not you ran the earlier "date and note" update.

alter table public.orders add column if not exists note text;
alter table public.orders drop column if exists requested_date;

-- shorten any existing note that is too long, then enforce the 125 limit
update public.orders set note = left(note, 125) where char_length(note) > 125;
alter table public.orders drop constraint if exists orders_note_max_125;
alter table public.orders add constraint orders_note_max_125 check (char_length(note) <= 125);

-- remove the older versions of the checkout function
drop function if exists public.place_order(text, text, jsonb);
drop function if exists public.place_order(text, text, jsonb, date, text);

create or replace function public.place_order(
  p_email text,
  p_name  text,
  p_items jsonb,
  p_note  text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order uuid;
  v_total integer := 0;
  v_note  text := nullif(left(btrim(coalesce(p_note, '')), 125), '');  -- max 125 characters
  r record;
  p record;
begin
  if p_email is null or position('@' in p_email) = 0 then
    raise exception 'A valid email is required';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'The cart is empty';
  end if;

  insert into orders (email, name, note)
    values (p_email, p_name, v_note)
    returning id into v_order;

  for r in
    select (e->>'product_id')::uuid as product_id, (e->>'quantity')::integer as qty
    from jsonb_array_elements(p_items) e
  loop
    if r.qty is null or r.qty <= 0 then raise exception 'Invalid quantity'; end if;
    select * into p from products where id = r.product_id and active = true for update;
    if not found then raise exception 'An item is no longer available'; end if;
    if p.stock < r.qty then raise exception 'Not enough stock for %', p.name; end if;
    update products set stock = stock - r.qty where id = p.id;
    insert into order_items (order_id, product_id, quantity, unit_price_cents)
      values (v_order, p.id, r.qty, p.price_cents);
    v_total := v_total + p.price_cents * r.qty;
  end loop;

  update orders set total_cents = v_total where id = v_order;
  return v_order;
end;
$$;

revoke all on function public.place_order(text, text, jsonb, text) from public;
grant execute on function public.place_order(text, text, jsonb, text) to anon, authenticated;
