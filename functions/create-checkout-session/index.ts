// supabase/functions/create-checkout-session/index.ts

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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
  }
});
