/// <reference types="https://deno.land/x/types/index.d.ts" />

import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonRes(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
    const STRIPE_PRICE_ID = Deno.env.get("STRIPE_PRICE_ID")!;
    const DEFAULT_APP_URL = Deno.env.get("APP_URL") ?? "http://localhost:5500";

    // Parse body (contest_code is required)
    const body = await req.json().catch(() => ({}));
    const contest_code = String(body?.contest_code ?? "").trim();
    const purchase_code = String(body?.purchase_code ?? "HELP").trim();
    const origin = typeof body?.origin === "string" ? body.origin : "";

    if (!contest_code) {
      return jsonRes({ error: "contest_code is required" }, 400);
    }

    // Identify user from Authorization header (Supabase session JWT)
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!jwt) return jsonRes({ error: "Missing Authorization bearer token" }, 401);

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return jsonRes({ error: "Not authenticated" }, 401);
    }
    const user_id = userData.user.id;

    const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });

    const appUrl = origin.startsWith("http") ? origin : DEFAULT_APP_URL;

    const success_url = `${appUrl}/dashboard.html?paid=1&contest_code=${encodeURIComponent(contest_code)}&code=${encodeURIComponent(purchase_code)}`;
    const cancel_url = `${appUrl}/pay.html?canceled=1`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
      success_url,
      cancel_url,
      client_reference_id: user_id,
      metadata: {
        user_id,
        contest_code,
        purchase_code,
      },
    });

    return jsonRes({ url: session.url });
  } catch (err) {
    console.error("create-checkout-session error:", err);
    return jsonRes({ error: String(err?.message ?? err) }, 500);
  }
});
