
from pathlib import Path
import re
import sys

TARGET = Path("admin.js")
if not TARGET.exists():
    print("ERROR: admin.js not found in the same folder as this script.")
    sys.exit(1)

text = TARGET.read_text(encoding="utf-8")

orig = text

# 1) Disable auto queueSync implementation
text = re.sub(
    r'let __syncTimer = null;\s*function queueSync\(\)\s*\{\s*clearTimeout\(__syncTimer\);\s*__syncTimer = setTimeout\(\(\) => syncContestToSupabase\(\)\.catch\(\(\) => \{\}\), 450\);\s*\}',
    'let __syncTimer = null;\\nfunction queueSync() {\\n  // disabled: no auto sync on render/load\\n}',
    text,
    count=1,
    flags=re.S,
)

# 2) Remove queueSync() call from render()
text = text.replace('// ✅ mirror state to Supabase (debounced)\\n  queueSync();', '')
text = text.replace('// ✅ mirror state to Supabase (debounced)\n  queueSync();', '')

# 3) Fallback: if any bare queueSync(); remains inside render block, remove first occurrence after render start
render_idx = text.find('function render()')
if render_idx != -1:
    next_block = text.find('/* ========================= LOAD', render_idx)
    if next_block != -1:
        render_block = text[render_idx:next_block]
        render_block = render_block.replace('queueSync();', '', 1)
        text = text[:render_idx] + render_block + text[next_block:]

if text == orig:
    print("WARNING: No changes were applied. Check if this admin.js already has the fix or has different formatting.")
else:
    TARGET.write_text(text, encoding="utf-8")
    print("OK: admin.js patched successfully.")
