(function () {
  const cfg = window.SHOP_CONFIG;
  const sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_PUBLISHABLE_KEY);
  const CART_KEY = "shop_cart_v1";

  // ---------- helpers ----------
  const money = (cents) =>
    new Intl.NumberFormat(cfg.LOCALE, { style: "currency", currency: cfg.CURRENCY }).format(cents / 100);

  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (k === "class") el.className = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) el.setAttribute(k, v);
    }
    for (const kid of kids.flat()) el.append(kid instanceof Node ? kid : document.createTextNode(kid ?? ""));
    return el;
  }

  // ---------- cart (kept in the browser; prices are re-checked by the database at checkout) ----------
  function getCart() {
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || {}; } catch { return {}; }
  }
  function saveCart(c) {
    try { localStorage.setItem(CART_KEY, JSON.stringify(c)); } catch {}
    updateBadge();
  }
  function cartCount() { return Object.values(getCart()).reduce((a, b) => a + b, 0); }
  function addToCart(id, qty, max) {
    const c = getCart();
    c[id] = Math.min((c[id] || 0) + qty, max ?? 99);
    saveCart(c);
  }
  function setQty(id, qty) {
    const c = getCart();
    if (qty <= 0) delete c[id]; else c[id] = qty;
    saveCart(c);
  }
  function updateBadge() {
    const n = cartCount();
    document.querySelectorAll("[data-cart-count]").forEach((el) => (el.textContent = n));
    document.querySelectorAll(".cart-link").forEach((el) => el.setAttribute("aria-label", `Cart, ${n} items`));
  }

  // ---------- shared header / footer (markup lives in each page; this only fills in dynamic bits) ----------
  function renderChrome() {
    document.querySelectorAll("[data-site-name]").forEach((el) => (el.textContent = cfg.SITE_NAME));
    document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
    updateBadge();
  }

  // ---------- products ----------
  async function fetchProducts() {
    const { data, error } = await sb.from("products").select("*").eq("active", true).order("created_at");
    if (error) throw error;
    return data;
  }

  function productCard(p) {
    let qty = 1;
    const out = p.stock <= 0;
    const qtyEl = h("span", { "aria-live": "polite" }, "1");
    const sync = () => (qtyEl.textContent = qty);
    const dec = h("button", { type: "button", "aria-label": `Remove one ${p.name}`, onclick: () => { qty = Math.max(1, qty - 1); sync(); } }, "−");
    const inc = h("button", { type: "button", "aria-label": `Add one ${p.name}`, onclick: () => { qty = Math.min(p.stock, qty + 1); sync(); } }, "+");
    const add = h("button", { type: "button", class: "btn", style: "flex:1", disabled: out,
      onclick: () => { addToCart(p.id, qty, p.stock); add.textContent = "Added"; setTimeout(() => (add.textContent = "Add to cart"), 1200); } },
      out ? "Sold out" : "Add to cart");
    return h("article", { class: "card" },
      h("div", { class: "ph" }, p.image_url ? h("img", { src: p.image_url, alt: p.name, loading: "lazy" }) : "ITEM PHOTO"),
      h("div", { class: "nm" }, h("span", {}, p.name), h("span", {}, money(p.price_cents))),
      out ? "" : h("div", { class: "row" }, h("div", { class: "step" }, dec, qtyEl, inc), add),
      out ? add : "");
  }

  async function renderProductGrid(target, { limit, filter } = {}) {
    const box = document.getElementById(target);
    box.replaceChildren(h("p", { class: "empty" }, "Loading…"));
    try {
      let items = await fetchProducts();
      if (filter) items = items.filter((p) => p.category === filter);
      if (limit) items = items.slice(0, limit);
      box.replaceChildren(...(items.length ? items.map(productCard) : [h("p", { class: "empty" }, "Nothing here yet. Please check back soon.")]));
      return items;
    } catch (e) {
      box.replaceChildren(h("p", { class: "empty msg err" }, "The shop could not load. Please refresh the page."));
      console.error(e);
    }
  }

  async function initShop() {
    const chipsBox = document.getElementById("chips");
    const all = await fetchProducts().catch(() => []);
    const cats = [...new Set(all.map((p) => p.category).filter(Boolean))];
    let current = null;
    const draw = () => {
      chipsBox.replaceChildren(...[null, ...cats].map((c) =>
        h("button", { type: "button", class: "chip", "aria-pressed": String(c === current),
          onclick: () => { current = c; draw(); renderProductGrid("grid", { filter: c }); } }, c ?? "All")));
    };
    draw();
    renderProductGrid("grid");
  }

  // ---------- cart page ----------
  async function initCart() {
    const lines = document.getElementById("lines");
    const summary = document.getElementById("summary");
    let products = [];
    try { products = await fetchProducts(); } catch (e) { lines.replaceChildren(h("p", { class: "empty msg err" }, "The cart could not load. Please refresh.")); return; }
    const byId = Object.fromEntries(products.map((p) => [p.id, p]));

    function draw() {
      const cart = getCart();
      // drop items that no longer exist; clamp to stock
      for (const id of Object.keys(cart)) {
        if (!byId[id]) delete cart[id]; else cart[id] = Math.min(cart[id], Math.max(byId[id].stock, 0)) || delete cart[id] && 0;
      }
      saveCart(Object.fromEntries(Object.entries(cart).filter(([, q]) => q > 0)));
      const entries = Object.entries(getCart());
      if (!entries.length) {
        lines.replaceChildren(h("p", { class: "empty" }, "Your cart is empty. "), h("a", { class: "link", href: "shop.html" }, "Browse the shop"));
        summary.hidden = true; return;
      }
      summary.hidden = false;
      let total = 0;
      lines.replaceChildren(...entries.map(([id, q]) => {
        const p = byId[id]; total += p.price_cents * q;
        return h("div", { class: "line" },
          h("div", { class: "ph" }, p.image_url ? h("img", { src: p.image_url, alt: p.name }) : "PHOTO"),
          h("div", { class: "info" }, h("span", { style: "font-size:17px" }, p.name),
            h("span", { style: "font-size:15px;color:var(--muted)" }, `${money(p.price_cents)} each`),
            h("button", { type: "button", class: "rm", onclick: () => { setQty(id, 0); draw(); } }, `Remove ${p.name}`)),
          h("div", { class: "step" },
            h("button", { type: "button", "aria-label": `Remove one ${p.name}`, onclick: () => { setQty(id, q - 1); draw(); } }, "−"),
            h("span", {}, q),
            h("button", { type: "button", "aria-label": `Add one ${p.name}`, disabled: q >= p.stock, onclick: () => { setQty(id, q + 1); draw(); } }, "+")),
          h("span", { class: "tot" }, money(p.price_cents * q)));
      }));
      document.getElementById("subtotal").textContent = money(total);
      document.getElementById("total").textContent = money(total);
    }
    draw();

    document.getElementById("checkout").addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const btn = document.getElementById("pay"), msg = document.getElementById("msg");
      const items = Object.entries(getCart()).map(([product_id, quantity]) => ({ product_id, quantity }));
      if (!items.length) return;
      btn.disabled = true; msg.className = "msg"; msg.textContent = "Placing your order…";
      const { data, error } = await sb.rpc("place_order", {
        p_email: document.getElementById("email").value.trim(),
        p_name: document.getElementById("cname").value.trim(),
        p_items: items });
      if (error) { msg.className = "msg err"; msg.textContent = error.message; btn.disabled = false; return; }
      saveCart({});
      document.querySelector(".cart-wrap").replaceChildren(h("div", {},
        h("h2", { style: "font-size:40px;margin-bottom:16px" }, "Thank you"),
        h("p", { class: "lead" }, `Your order is placed. Reference: ${data}. We will email you the details.`),
        h("a", { class: "pill solid", href: "shop.html" }, "Back to the shop")));
    });
  }

  window.Shop = { renderChrome, renderProductGrid, initShop, initCart };
})();
