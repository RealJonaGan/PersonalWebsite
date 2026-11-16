-- Run this ONCE in Supabase > SQL Editor.
-- Adds an optional "sort_order" column to products.

alter table public.products add column if not exists sort_order integer;

-- Optional: number the items you already have, in the order you want.
-- Uncomment and edit the lines below, or just type the numbers in the Table Editor.
-- update public.products set sort_order = 10 where name = 'Sample item one';
-- update public.products set sort_order = 20 where name = 'Sample item two';
