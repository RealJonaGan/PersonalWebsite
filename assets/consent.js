(function () {
  const KEY = "consent_v1";
  const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 180; // ask again after about 6 months
  let analyticsLoaded = false;

  // ====== PUT YOUR ANALYTICS HERE ======
  // This runs ONLY after a visitor accepts. Paste your analytics snippet inside.
  // Example for Google Analytics 4 (replace G-XXXXXXXXXX with your own ID):
  //   const s = document.createElement("script");
  //   s.async = true;
  //   s.src = "https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX";
  //   document.head.appendChild(s);
  //   window.dataLayer = window.dataLayer || [];
  //   function gtag(){ dataLayer.push(arguments); }
  //   gtag("js", new Date()); gtag("config", "G-XXXXXXXXXX");
  function loadAnalytics() {
    if (analyticsLoaded) return;
    analyticsLoaded = true;
    // paste your analytics code here
  }
  // =====================================

  function read() {
    try {
      const v = JSON.parse(localStorage.getItem(KEY));
      if (v && typeof v.analytics === "boolean" && Date.now() - v.ts < MAX_AGE_MS) return v;
    } catch {}
    return null;
  }
  function save(analytics) {
    try { localStorage.setItem(KEY, JSON.stringify({ analytics, ts: Date.now() })); } catch {}
  }

  function closeBanner(opener) {
    const b = document.getElementById("consent-banner");
    if (b) b.remove();
    if (opener && opener.isConnected) opener.focus();
  }

  function showBanner(opener) {
    if (document.getElementById("consent-banner")) return;
    const wasAccepted = (read() || {}).analytics === true;
    const box = document.createElement("section");
    box.id = "consent-banner";
    box.setAttribute("role", "region");
    box.setAttribute("aria-labelledby", "consent-title");
    box.innerHTML =
      '<h2 id="consent-title">Your privacy</h2>' +
      "<p>I would like to use analytics to understand how this site is used, so I can improve it. " +
      "Analytics stays off unless you accept. You can change your choice at any time with “Cookie settings” in the footer. " +
      '<a href="#">Privacy policy</a></p>' +
      '<div class="consent-actions">' +
      '<button type="button" class="consent-btn" data-choice="decline">Decline</button>' +
      '<button type="button" class="consent-btn" data-choice="accept">Accept</button>' +
      "</div>";
    box.addEventListener("click", (e) => {
      const choice = e.target.getAttribute && e.target.getAttribute("data-choice");
      if (!choice) return;
      const accept = choice === "accept";
      save(accept);
      closeBanner(opener);
      if (accept) loadAnalytics();
      else if (wasAccepted) location.reload(); // makes sure analytics is not running after withdrawal
    });
    box.addEventListener("keydown", (e) => { if (e.key === "Escape" && read()) closeBanner(opener); });
    document.body.appendChild(box);
    box.querySelector("button").focus();
  }

  document.addEventListener("click", (e) => {
    const t = e.target.closest && e.target.closest("[data-consent-open]");
    if (t) { e.preventDefault(); showBanner(t); }
  });

  const saved = read();
  if (!saved) showBanner();
  else if (saved.analytics) loadAnalytics();
})();
