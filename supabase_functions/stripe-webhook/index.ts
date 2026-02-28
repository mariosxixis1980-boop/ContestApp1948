// Supabase Edge Function: stripe-webhook
// Deploy name: stripe-webhook
//
// Required secrets in Supabase:
//   STRIPE_SECRET_KEY      = sk_test_... (or sk_live_...)  (used to fetch session if needed)
//   STRIPE_WEBHOOK_SECRET  = whsec_...
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//
// This webhook will upsert help_purchases when checkout.session.completed fires.
//
// Table expected: help_purchases(user_id uuid, contest_code text, purchased_at timestamptz, remaining int4, used_match_ids jsonb, updated_at timestamptz)
// Unique constraint recommended: UNIQUE(user_id, contest_code)

import Stripe from "https://esm.sh/stripe@14.25.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4?target=deno";

async function hmacSha256(secret: string, payload: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

async function verifyStripeSignature(rawBody: string, sigHeader: string, secret: string) {
  // Stripe-Signature: t=timestamp,v1=signature,...
  const parts = sigHeader.split(",").map((p) => p.trim());
  const tPart = parts.find((p) => p.startsWith("t="));
  const v1Part = parts.find((p) => p.startsWith("v1="));
  if (!tPart || !v1Part) return false;
  const t = tPart.slice(2);
  const v1 = v1Part.slice(3);
  const signedPayload = `${t}.${rawBody}`;
  const expected = await hmacSha256(secret, signedPayload);
  return timingSafeEqual(expected, v1);
}

Deno.serve(async (req) => {
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";
  const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!webhookSecret || !supabaseUrl || !serviceKey) {
    return new Response("Missing secrets", { status: 500 });
  }

  const sig = req.headers.get("stripe-signature") || "";
  const rawBody = await req.text();

  const ok = await verifyStripeSignature(rawBody, sig, webhookSecret);
  if (!ok) return new Response("Invalid signature", { status: 400 });

  const event = JSON.parse(rawBody);

  if (event?.type !== "checkout.session.completed") {
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  const session = event?.data?.object || {};
  const contest_code = String(session?.metadata?.contest_code || "").trim();

  // We need user_id. Best practice: store it in metadata at checkout creation.
  // If you later update create-checkout-session to include user_id metadata, webhook will use it.
  const user_id = String(session?.metadata?.user_id || "").trim();

  if (!contest_code || !user_id) {
    // Not enough info to grant help
    return new Response(JSON.stringify({ error: "Missing contest_code/user_id in metadata" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  const sb = createClient(supabaseUrl, serviceKey);

  const purchased_at = new Date((Number(session?.created) || Math.floor(Date.now() / 1000)) * 1000).toISOString();

  const payload = {
    user_id,
    contest_code,
    purchased_at,
    remaining: 3,
    used_match_ids: [],
    updated_at: new Date().toISOString(),
  };

  const { error } = await sb.from("help_purchases").upsert(payload, { onConflict: "user_id,contest_code" });
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
});
