// supabase/functions/create-checkout-session/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "https://esm.sh/stripe@14.25.0?target=deno";

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

  try {
    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    const STRIPE_PRICE_ID = Deno.env.get("STRIPE_PRICE_ID");
    const APP_URL = Deno.env.get("APP_URL");

    if (!STRIPE_SECRET_KEY || !STRIPE_PRICE_ID || !APP_URL) {
      return new Response(
        JSON.stringify({
          error:
            "Missing secrets. Check STRIPE_SECRET_KEY, STRIPE_PRICE_ID, APP_URL in Supabase > Edge Functions > Secrets",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // (optional) you can pass user_id etc from frontend
    const body = await req.json().catch(() => ({}));

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2024-06-20",
    });

    const successUrl = `${APP_URL.replace(/\/$/, "")}/dashboard.html?paid=1`;
    const cancelUrl = `${APP_URL.replace(/\/$/, "")}/dashboard.html?paid=0`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      // If later you want: customer_email: body.email,
      // metadata: { user_id: body.user_id ?? "" },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
