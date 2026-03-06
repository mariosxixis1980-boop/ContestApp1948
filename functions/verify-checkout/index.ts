// supabase edge function: verify-checkout
// Verifies a Stripe Checkout Session is paid and grants HELP for the contest.
// Uses Stripe REST API (fetch) for Deno compatibility.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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
    const SUPABASE_URL = (Deno.env.get("SUPABASE_URL") ?? "").trim();
    const SERVICE_ROLE_KEY = (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "").trim();

    if (!STRIPE_SECRET_KEY || !SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return json(
        {
          error:
            "Missing secrets. Check STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.",
        },
        500,
      );
    }

    // Require an authenticated user (Authorization header from client)
    const authHeader = req.headers.get("authorization") || "";
    if (!authHeader.toLowerCase().startsWith("bearer ")) {
      return json({ error: "Missing Authorization Bearer token" }, 401);
    }

    const body = (await req.json().catch(() => ({}))) as {
      session_id?: string;
      contest_code?: string;
    };

    const session_id = body.session_id?.trim();
    const contest_code = body.contest_code?.trim();

    if (!session_id || !contest_code) {
      return json({ error: "session_id and contest_code required" }, 400);
    }

    // Who is the caller?
    const authed = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await authed.auth.getUser();
    if (userErr || !userData?.user) {
      return json({ error: "Invalid user session" }, 401);
    }
    const user_id = userData.user.id;

    // Fetch Stripe session
    const stripeRes = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(session_id)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        },
      },
    );

    const stripeSession = await stripeRes.json().catch(() => ({}));
    if (!stripeRes.ok) {
      return json({ error: "Stripe error", details: stripeSession }, 500);
    }

    const paid = stripeSession?.payment_status === "paid";
    if (!paid) {
      return json({ error: "Session not paid" }, 400);
    }

    // Prefer contest_code from Stripe metadata if present
    const metaCode = stripeSession?.metadata?.contest_code;
    if (metaCode && metaCode !== contest_code) {
      return json({ error: "contest_code mismatch" }, 400);
    }

    // Use service role for DB write (bypass RLS)
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Grant help for this user+contest (idempotent on DB side)
    const { data: grantData, error: grantErr } = await admin.rpc(
      "grant_help_for_contest",
      { p_user_uuid: user_id, p_contest_code: contest_code },
    );

    if (grantErr) {
      return json({ error: "Failed to grant help", details: grantErr }, 500);
    }

    return json({ ok: true, granted: grantData }, 200);
  } catch (e) {
    return json({ error: String((e as any)?.message ?? e) }, 500);
  }
});
