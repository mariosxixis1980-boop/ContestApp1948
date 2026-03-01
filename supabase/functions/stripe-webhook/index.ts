/// <reference types="https://deno.land/x/types/index.d.ts" />

import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
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
    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
    const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });

    const sig = req.headers.get("stripe-signature");
    if (!sig) return jsonRes({ error: "Missing stripe-signature header" }, 400);

    const rawBody = await req.text(); // IMPORTANT: raw string for signature verification
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return jsonRes({ error: "Invalid signature" }, 400);
    }

    // We only care about successful checkouts
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      const user_id = String(session.metadata?.user_id ?? session.client_reference_id ?? "").trim();
      const contest_code = String(session.metadata?.contest_code ?? "").trim();

      if (!user_id || !contest_code) {
        console.warn("Missing metadata:", { user_id, contest_code });
        return jsonRes({ received: true, skipped: true });
      }

      const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      // Give (at least) 3 helps for this contest
      // Prefer upsert; if there is no unique constraint, fall back to insert/update.
      const payload = { user_id, contest_code, remaining: 3 };

      let upsertOk = true;
      const { error: upErr } = await supabaseAdmin
        .from("help_purchases")
        .upsert(payload as any, { onConflict: "user_id,contest_code" });

      if (upErr) {
        upsertOk = false;
        console.warn("Upsert failed, falling back:", upErr.message);

        // Fallback: try insert, or update if already exists
        const { data: existing, error: selErr } = await supabaseAdmin
          .from("help_purchases")
          .select("remaining")
          .eq("user_id", user_id)
          .eq("contest_code", contest_code)
          .maybeSingle();

        if (selErr) {
          console.error("Select fallback failed:", selErr);
        } else if (!existing) {
          const { error: insErr } = await supabaseAdmin.from("help_purchases").insert(payload as any);
          if (insErr) console.error("Insert fallback failed:", insErr);
        } else {
          const newRemaining = Math.max(Number(existing.remaining ?? 0), 3);
          const { error: updErr } = await supabaseAdmin
            .from("help_purchases")
            .update({ remaining: newRemaining } as any)
            .eq("user_id", user_id)
            .eq("contest_code", contest_code);
          if (updErr) console.error("Update fallback failed:", updErr);
        }
      }

      console.log("Processed checkout.session.completed", { user_id, contest_code, upsertOk });
    }

    return jsonRes({ received: true });
  } catch (err) {
    console.error("stripe-webhook error:", err);
    return jsonRes({ error: String(err?.message ?? err) }, 500);
  }
});
