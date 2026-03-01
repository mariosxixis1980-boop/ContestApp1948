import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import Stripe from "npm:stripe"

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
})

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 })
  }

  const signature = req.headers.get("stripe-signature")
  if (!signature) {
    return new Response("Missing signature", { status: 400 })
  }

  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!
  const body = await req.text()

  let event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (_err) {
    return new Response("Invalid signature", { status: 400 })
  }

  if (event.type === "checkout.session.completed") {
    const session: any = event.data.object

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

    await fetch(`${supabaseUrl}/rest/v1/help_purchases`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        user_id: session?.metadata?.user_id ?? null,
        contest_code: session?.metadata?.contest_code ?? null,
        stripe_event_id: event.id,
        stripe_session_id: session.id,
        amount_total: session.amount_total ?? null,
        currency: session.currency ?? null,
        status: "paid",
        purchased_at: new Date().toISOString(),
      }),
    })
  }

  return new Response("ok", { status: 200 })
})
