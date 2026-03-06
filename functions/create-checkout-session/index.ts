<<<<<<< HEAD
// supabase/functions/create-checkout-session/index.ts

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe";
=======
// supabase edge function: create-checkout-session
// Uses Stripe REST API (fetch) to avoid Stripe SDK incompatibility in Deno.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
>>>>>>> bfefd81 (CMP update - fixed auth, reset password, help flow)

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

<<<<<<< HEAD
Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Use POST" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    const STRIPE_PRICE_ID = Deno.env.get("STRIPE_PRICE_ID");
    const APP_URL = Deno.env.get("APP_URL");

    if (!STRIPE_SECRET_KEY) throw new Error("Missing STRIPE_SECRET_KEY secret");
    if (!STRIPE_PRICE_ID) throw new Error("Missing STRIPE_PRICE_ID secret");
    if (!APP_URL) throw new Error("Missing APP_URL secret");

    // optional body fields
    let body: any = {};
    try {
      body = await req.json();
    } catch (_) {
      body = {};
    }

    // Αν έχεις login, μπορείς να στείλεις email από το frontend
    const customer_email =
      typeof body?.customer_email === "string" ? body.customer_email : undefined;

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2024-06-20",
    });

    const success_url = `${APP_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`;
    const cancel_url = `${APP_URL}/cancel.html`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
      success_url,
      cancel_url,
      customer_email,
      // Αν θες να στέλνεις metadata (π.χ. uid) από frontend:
      // metadata: { uid: body?.uid ?? "" },
    });

    return new Response(JSON.stringify({ url: session.url, id: session.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : String(err),
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
=======
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const STRIPE_SECRET_KEY = (Deno.env.get("STRIPE_SECRET_KEY") ?? "").trim();
    const STRIPE_PRICE_ID = (Deno.env.get("STRIPE_PRICE_ID") ?? "").trim();
    const APP_URL = (Deno.env.get("APP_URL") ?? "").trim();

    if (!STRIPE_SECRET_KEY || !STRIPE_PRICE_ID || !APP_URL) {
      return json(
        {
          error:
            "Missing secrets. Check STRIPE_SECRET_KEY, STRIPE_PRICE_ID, APP_URL in Edge Functions > Secrets.",
        },
        500,
      );
    }

    // Must be a real absolute URL
    if (!APP_URL.startsWith("http://") && !APP_URL.startsWith("https://")) {
      return json(
        { error: `APP_URL must start with http:// or https:// (got: ${APP_URL})` },
        500,
      );
    }

    const body = (await req.json().catch(() => ({}))) as {
      email?: string;
      contest_code?: string;
    };

    const email = body.email?.trim();
    const contest_code = body.contest_code?.trim();

    if (!contest_code) return json({ error: "contest_code missing" }, 400);

    const base = APP_URL.replace(/\/$/, "");

    const success_url =
      `${base}/dashboard.html?paid=1&session_id={CHECKOUT_SESSION_ID}&contest_code=` +
      encodeURIComponent(contest_code);

    const cancel_url =
      `${base}/dashboard.html?canceled=1&contest_code=` +
      encodeURIComponent(contest_code);

    // Stripe expects x-www-form-urlencoded
    const form = new URLSearchParams();
    form.set("mode", "payment");
    form.set("success_url", success_url);
    form.set("cancel_url", cancel_url);
    form.set("line_items[0][price]", STRIPE_PRICE_ID);
    form.set("line_items[0][quantity]", "1");

    // Store contest_code in Stripe metadata (so verify-checkout can trust it)
    form.set("metadata[contest_code]", contest_code);

    if (email) form.set("customer_email", email);

    const r = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });

    const data = await r.json().catch(() => ({}));

    if (!r.ok) {
      return json({ error: "Stripe error", details: data }, 500);
    }

    // Stripe returns { url: "https://checkout.stripe.com/..." }
    return json({ url: data.url }, 200);
  } catch (e) {
    return json({ error: String((e as any)?.message ?? e) }, 500);
>>>>>>> bfefd81 (CMP update - fixed auth, reset password, help flow)
  }
});
