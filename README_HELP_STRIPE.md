# HELP αγορά (Stripe) - Τι να ρυθμίσεις

## 1) Edge Function secrets
Supabase → Edge Functions → Secrets:

- STRIPE_SECRET_KEY = (Stripe secret key)
- STRIPE_PRICE_ID = (Stripe price id για το €1.99)
- APP_URL = **το base URL του app σου**
  - local: http://127.0.0.1:5500
  - production: https://το-domain-σου

Για το verify-checkout πρόσθεσε επίσης:
- SUPABASE_URL = (π.χ. https://xxxx.supabase.co)
- SUPABASE_ANON_KEY = (anon)
- SUPABASE_SERVICE_ROLE_KEY = (service_role)

## 2) Deploy functions
Supabase → Edge Functions:
- create-checkout-session (υπάρχει ήδη)
- verify-checkout (νέο) → βάλε το code από `functions/verify-checkout/index.ts`

Σημαντικό: στο verify-checkout κράτα **JWT verification ON** (default).  
Το dashboard.js στέλνει το user token αυτόματα.

## 3) SQL
Τρέξε το `SUPABASE_HELP_PURCHASES.sql` στο SQL Editor.

## 4) Flow
- Dashboard → Αγορά HELP → pay.html
- pay.html καλεί create-checkout-session και σε πάει Stripe
- Stripe επιστρέφει σε dashboard.html?paid=1&contest_code=...&session_id=...
- dashboard.js καλεί verify-checkout και μετά κάνει reload.
