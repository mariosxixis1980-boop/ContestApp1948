
Admin sync fix patch

What this fixes:
- Stops admin.js from auto-writing contest state to Supabase on render/load
- Prevents PC and mobile admin from fighting over the active contest

How to use:
1. Extract this zip.
2. Put patch_admin_sync_fix.py in the SAME folder as your admin.js
3. Run:
   python patch_admin_sync_fix.py
4. Replace/upload the patched admin.js into your project
5. Push to GitHub and wait for Cloudflare deploy
6. In Supabase set:
   - UPXQK -> active = true
   - 3IH1R -> active = false

If you do not have Python:
- Open admin.js in a code editor
- Replace the queueSync() function with an empty one
- Remove queueSync(); from inside render()

After deploy:
- Use admin from one device at a time until you confirm the fix
