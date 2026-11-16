# Webshop (Supabase + static pages)

1. Supabase > SQL Editor: run `supabase/schema.sql` (creates products, orders, order_items, security rules and the checkout function).
2. Supabase > Project Settings > API: copy the Project URL and the anon public key into `assets/config.js`.
3. Upload this folder to your website (or open `index.html` through any local web server).
4. Add your own items in Supabase > Table Editor > products (name, price_cents, category, stock, image_url, active).

Prices are stored in cents (1500 = 15.00). Orders arrive in the `orders` table with status `pending`.
Payment (for example Stripe or Mollie) is not included yet.
