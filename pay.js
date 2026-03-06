// pay.js - Stripe checkout launcher for HELP purchase
// IMPORTANT: We call the Edge Function with fetch and pass the *user access token* as Bearer.
// Using supabase.functions.invoke can (in some setups) send the anon key as Bearer and Edge Functions reject it as "Invalid JWT".

import { supabase, ensureSupabaseConfig } from "./supabase.js";

const SUPABASE_FUNCTION = "create-checkout-session";

const $ = (id) => document.getElementById(id);

function show(id, txt, kind = "") {
  const el = $(id);
  if (!el) return;
  el.textContent = txt;
  el.style.display = "block";
  el.className = kind ? `status ${kind}` : "status";
}

function hide(id) {
  const el = $(id);
  if (!el) return;
  el.style.display = "none";
}

function getContestCode() {
  // Prefer querystring (?contest_code=XXXX) then localStorage.
  const qs = new URLSearchParams(location.search);
  const fromQS = (qs.get("contest_code") || "").trim();
  if (fromQS) {
    localStorage.setItem("cmp_contest_code", fromQS);
    return fromQS;
  }
  return (localStorage.getItem("cmp_contest_code") || "").trim();
}

function setContestPill() {
  const code = getContestCode();
  const pill = $("contestPill") || $("contestCode");
  if (pill) pill.textContent = code ? ("Contest: " + code) : "Contest: —";
}

async function requireSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const session = data?.session;
  if (!session) {
    // Not logged in -> go to login
    window.location.href = "login.html";
    return null;
  }
  return session;
}

async function startCheckout() {
  hide("status");
  const contest_code = getContestCode();

  console.log("[PAY] click -> startCheckout");
  if (!contest_code) {
    console.warn("[PAY] Missing contest_code");
    show("status", "Λείπει contest_code. Γύρισε πίσω στο Dashboard και ξαναπάτα αγορά HELP.", "warn");
    return;
  }

  const btn = $("buyStripeBtn");
  if (btn) btn.disabled = true;
  show("status", "⏳ Ετοιμάζουμε το checkout…");

  try {
    const session = await requireSession();
    if (!session) return;

    const { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY } = ensureSupabaseConfig();
    const accessToken = session.access_token;

    console.log("[PAY] invoking function", SUPABASE_FUNCTION, { contest_code });

    const r = await fetch(`${SUPABASE_URL}/functions/v1/${SUPABASE_FUNCTION}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ contest_code, note: "HELP" }),
    });

    const text = await r.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    if (!r.ok) {
      const msg = data?.message || data?.error || text || `HTTP ${r.status}`;
      throw new Error(msg);
    }

    if (!data?.url) throw new Error("No checkout url returned.");

    show("status", "✅ Άνοιγμα Stripe…", "ok");
    window.location.href = data.url;
  } catch (e) {
    console.error("[PAY] checkout error", e);
    show("status", "❌ Σφάλμα: " + (e?.message || String(e)), "err");
    if (btn) btn.disabled = false;
  }
}

function attachHandlers() {
  const back = $("backBtn");
  const buy = $("buyStripeBtn");

  if (back) back.addEventListener("click", () => (window.location.href = "dashboard.html"));
  if (buy) buy.addEventListener("click", startCheckout);

  console.log("[PAY] click handler attached");
}

(function init() {
  setContestPill();
  attachHandlers();
})();
