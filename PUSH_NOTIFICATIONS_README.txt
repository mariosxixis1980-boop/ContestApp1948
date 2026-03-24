CMP Push Notifications - what to do next

1) Open dashboard.js
2) Find:
   const CMP_VAPID_PUBLIC_KEY = "PASTE_YOUR_VAPID_PUBLIC_KEY_HERE";
3) Replace only that text with your real VAPID public key.
4) Save and deploy.
5) Open dashboard and press Enable Notifications.

Important:
- push_subscriptions table must already exist
- endpoint should be UNIQUE in Supabase for upsert to work best
- service worker file is sw.js
