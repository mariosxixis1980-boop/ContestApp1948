// Supabase Edge Function: create-checkout-session
// Deploy name: create-checkout-session
// Required secrets in Supabase:
//   STRIPE_SECRET_KEY = sk_test_... (or sk_live_...)
//   STRIPE_PRICE_ID   = price_...
//
// Optional:
//   STRIPE_SUCCESS_PATH = /dashboard.html?paid=1
//   STRIPE_CANCEL_PATH  = /dashboard.html
//
// This function creates a Stripe Checkout Session and returns { url }.
//
// NOTE: No Stripe secrets should ever be in frontend code.

import Stripe from "https://esm.sh/stripe@14.25.0?target=deno";

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

    const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
    const priceId = Deno.env.get("STRIPE_PRICE_ID") ?? "";
    if (!stripeSecret || !priceId) {
      return new Response(JSON.stringify({ error: "Missing STRIPE_SECRET_KEY/STRIPE_PRICE_ID" }), {
        status: 500,
        headers: { "content-type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") || "";
    // We don't validate JWT manually here; Supabase will attach it, and webhook will be source of truth.

    const body = await req.json().catch(() => ({}));
    const contest_code = String(body?.contest_code || "").trim();
    if (!contest_code) {
      return new Response(JSON.stringify({ error: "Missing contest_code" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    const origin = req.headers.get("origin") || body?.origin || "http://localhost";
    const successPath = Deno.env.get("STRIPE_SUCCESS_PATH") || "/dashboard.html?paid=1";
    const cancelPath = Deno.env.get("STRIPE_CANCEL_PATH") || "/dashboard.html";
    const success_url = `${origin}${successPath}&session_id={CHECKOUT_SESSION_ID}`;
    const cancel_url = `${origin}${cancelPath}`;

    const stripe = new Stripe(stripeSecret, { apiVersion: "2023-10-16" });

    // Extract user_id from JWT via Supabase Auth (optional but useful for metadata).
    // Frontend already has auth session; we also send it in Authorization header.
    // We can't reliably decode here without libs; metadata can be filled by webhook from session itself.
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url,
      cancel_url,
      metadata: {
        contest_code,
      },
      // You can enable customer_email if you want, but it's not required.
    });

    return new Response(JSON.stringify({ url: session.url, id: session.id }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
});
