# Stripe (TEST) setup for CMP

This project keeps all gameplay logic unchanged. Payment is handled via Stripe Checkout + Supabase Edge Functions.

## 1) Create Stripe product
Create product "CMP Help" €1.99 (one-time) and copy the price id: `price_...`

## 2) Set Supabase Function secrets
In Supabase Dashboard → Edge Functions → Secrets:

- STRIPE_SECRET_KEY = sk_test_...
- STRIPE_PRICE_ID   = price_...
- STRIPE_WEBHOOK_SECRET = whsec_...   (after you create webhook in Stripe)
- SUPABASE_SERVICE_ROLE_KEY = (Supabase Settings → API → service_role key)
- SUPABASE_URL = (your project url)  [usually already exists in edge env]

Optional:
- STRIPE_SUCCESS_PATH = /dashboard.html?paid=1
- STRIPE_CANCEL_PATH  = /dashboard.html

## 3) Deploy edge functions
Use Supabase CLI:

- supabase functions deploy create-checkout-session
- supabase functions deploy stripe-webhook

(Functions code is in `ContestApp2/supabase_functions/`)

## 4) Create Stripe webhook (test mode)
Stripe Dashboard (Test mode) → Developers → Webhooks → Add endpoint
Endpoint URL:
  https://<your-supabase-project>.functions.supabase.co/stripe-webhook

Events:
  checkout.session.completed

Copy signing secret `whsec_...` into Supabase secrets as STRIPE_WEBHOOK_SECRET.

## 5) Important: add user_id to metadata
In create-checkout-session, we currently only set contest_code in metadata.
For webhook to grant help, add user_id to metadata.

Simplest way:
- In pay.html, pass user_id in body to the function, OR
- Decode JWT in edge function and set metadata.user_id.

If you want the easy route, tell me and I'll update the edge function to accept `user_id` from the frontend body.

## 6) Frontend flow
- Dashboard button → pay.html
- pay.html → calls `create-checkout-session` and redirects to Stripe.
- After payment, user returns to dashboard.html?paid=1
- Webhook grants help in `help_purchases` (remaining=3)

Until webhook is fully configured, pay.html falls back to TEST activation (so your app still works).
