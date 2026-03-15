import { supabase, ensureSupabaseConfig } from "./supabase.js";

const DASH_LANG_KEY = "CMP_LANG";
const DASH_I18N = {
  el: {
    dashboardTitle: "⚽ Dashboard",
    dashboardSub: "Το παιχνίδι είναι σε δοκιμαστική περίοδο. Ευχαριστώ για την συμμετοχή σας. Ο ΔΙΑΓΩΝΙΣΜΟΣ ΞΕΚΙΝΗΣΕ. 7 ΑΓΩΝΕΣ ΒΡΙΣΚΟΝΤΑΙ ΣΤΟ ΠΙΝΑΚΑ ΣΑΣ.. (( Βάλε 1 / X / 2, πάτα Save (ή αλλάζει αυτόματα). Κλείδωμα πριν το deadline)).",
    leaderboard: "🏆 Leaderboard",
    admin: "🛠 Admin",
    logout: "🚪 Logout",
    install: "📲 Install App",
    user: "Χρήστης",
    round: "Αγωνιστική",
    deadline: "Deadline",
    status: "Κατάσταση",
    statusOpen: "🟢 Ανοιχτές",
    statusLocked: "🔒 Κλειδωμένες",
    buyHelp: "🧠 Αγορά HELP (€1,99)",
    lockPreds: "🔒 Κλείδωμα προβλέψεων",
    finalWeek: "🏁 Final Week",
    rules: "Κανονισμός",
    terms: "Όροι",
    privacy: "Privacy",
    pickPlaceholder: "Pick: -",
    save: "Save",
    help: "HELP",
    final: "Τελικό",
    correct: "Σωστό",
    wrong: "Λάθος",
    openMatches: "Ανοιχτές",
    lockedMatches: "Κλειδωμένες",
    installIos: "📱 iPhone/iPad: Safari → Share → Add to Home Screen",
    installFallback: "Για εγκατάσταση άνοιξε το μενού του browser και πάτα Install app ή Add to Home Screen.",
    buyHelpCount: "🛒 Help αγοράς",
    quizHelpCount: "🧠 Help Quiz",
    totalHelpCount: "🎯 Συνολικά Help",
  },
  en: {
    dashboardTitle: "⚽ Dashboard",
    dashboardSub: "The game is in test mode. Thank you for joining. THE CONTEST HAS STARTED. 7 MATCHES ARE ON YOUR BOARD. (( Pick 1 / X / 2, press Save (or it changes automatically). Lock before the deadline)).",
    leaderboard: "🏆 Leaderboard",
    admin: "🛠 Admin",
    logout: "🚪 Logout",
    install: "📲 Install App",
    user: "User",
    round: "Round",
    deadline: "Deadline",
    status: "Status",
    statusOpen: "🟢 Open",
    statusLocked: "🔒 Locked",
    buyHelp: "🧠 Buy HELP (€1.99)",
    lockPreds: "🔒 Lock predictions",
    finalWeek: "🏁 Final Week",
    rules: "Rules",
    terms: "Terms",
    privacy: "Privacy",
    pickPlaceholder: "Pick: -",
    save: "Save",
    help: "HELP",
    final: "Final",
    correct: "Correct",
    wrong: "Wrong",
    openMatches: "Open",
    lockedMatches: "Locked",
    installIos: "📱 iPhone/iPad: Safari → Share → Add to Home Screen",
    installFallback: "To install, open the browser menu and tap Install app or Add to Home Screen.",
    buyHelpCount: "🛒 Purchase Help",
    quizHelpCount: "🧠 Quiz Help",
    totalHelpCount: "🎯 Total Help",
  }
};
let currentLang = localStorage.getItem(DASH_LANG_KEY) || "el";
if (!DASH_I18N[currentLang]) currentLang = "el";
const t = (k) => (DASH_I18N[currentLang] && DASH_I18N[currentLang][k]) || DASH_I18N.el[k] || k;
let dashboardState = { username: '-', code: '-', round: '-', deadlineText: '-', locked: false };
function refreshDashboardLabels() {
  document.documentElement.lang = currentLang;
  const h1 = document.querySelector('h1');
  if (h1) h1.textContent = t('dashboardTitle');
  const sub = document.querySelector('.sub');
  if (sub) sub.textContent = t('dashboardSub');
  const lb = document.getElementById('leaderboardBtn');
  if (lb) lb.textContent = t('leaderboard');
  const admin = document.getElementById('adminLink');
  if (admin) admin.textContent = t('admin');
  const lo = document.getElementById('lo');
  if (lo) lo.textContent = t('logout');
  const installBtn = document.getElementById('installBtn');
  if (installBtn) installBtn.textContent = t('install');
  const buyBtn = document.getElementById('buyBtn');
  if (buyBtn) buyBtn.textContent = t('buyHelp');
  const lockBtn = document.getElementById('lockBtn');
  if (lockBtn && !lockBtn.classList.contains('locked')) lockBtn.textContent = t('lockPreds');
  const fw = document.getElementById('finalWeekPill');
  if (fw) fw.textContent = t('finalWeek');
  const iph = document.getElementById('iphoneInstall');
  if (iph) iph.textContent = t('installIos');
  const buyHelpCountPill = document.getElementById("buyHelpCountPill");
  const quizHelpCountPill = document.getElementById("quizHelpCountPill");
  const totalHelpCountPill = document.getElementById("totalHelpCountPill");
  if (buyHelpCountPill || quizHelpCountPill || totalHelpCountPill) {
    const buyVal = Number((buyHelpCountPill?.textContent || "").split(":").pop()?.trim() || 0);
    const quizVal = Number((quizHelpCountPill?.textContent || "").split(":").pop()?.trim() || 0);
    renderHelpBreakdown(buyVal, quizVal);
  }
  const footerLinks = document.querySelectorAll('.footer-legal a');
  if (footerLinks[0]) footerLinks[0].textContent = t('rules');
  if (footerLinks[1]) footerLinks[1].textContent = t('terms');
  if (footerLinks[2]) footerLinks[2].textContent = t('privacy');
  setText('userPill', `${t('user')}: ${dashboardState.username ?? '-'}`);
  setText('contestInfo', `Contest: ${dashboardState.code ?? '-'}`);
  setText('roundInfo', `${t('round')}: ${dashboardState.round ?? '-'}`);
  const dText = dashboardState.deadlineText ?? '-';
  if (dText !== '-') setText('deadlineInfo', `${t('deadline')}: ${dText}`);
  setText('statusPill', `${t('status')}: ${dashboardState.locked ? t('statusLocked') : t('statusOpen')}`);
  document.querySelectorAll('#matches .match').forEach((row)=>{
    const sel = row.querySelector('select');
    if (sel && sel.options[0]) sel.options[0].textContent = t('pickPlaceholder');
    const saveBtn = row.querySelector('.matchActions .btn:last-child');
    const helpBtn = row.querySelector('.matchActions .btn:first-child');
    if (saveBtn) saveBtn.textContent = t('save');
    if (helpBtn) helpBtn.textContent = t('help');
    const finalEl = row.querySelector('.matchMeta .mini');
    if (finalEl && finalEl.textContent.startsWith('Τελικό:')) finalEl.textContent = finalEl.textContent.replace('Τελικό', t('final'));
    if (finalEl && finalEl.textContent.startsWith('Final:')) finalEl.textContent = finalEl.textContent.replace('Final', t('final'));
    const statusEl = row.querySelectorAll('.matchMeta .mini')[1];
    if (statusEl) {
      if (statusEl.textContent === 'Σωστό' || statusEl.textContent === 'Correct') statusEl.textContent = t('correct');
      if (statusEl.textContent === 'Λάθος' || statusEl.textContent === 'Wrong') statusEl.textContent = t('wrong');
    }
  });
}

// Call a Supabase Edge Function using supabase-js.
// This automatically calls: <SUPABASE_URL>/functions/v1/<functionName>
// and attaches apikey + Authorization from the current session.
async function callEdgeFunction(functionName, body) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not logged in");

  const { data, error } = await supabase.functions.invoke(functionName, {
    body: body ?? {},
  });

  if (error) {
    const ctxBody = error?.context?.body;
    const msg =
      (typeof ctxBody === "string" && ctxBody) ? ctxBody :
      (ctxBody ? JSON.stringify(ctxBody) : (error.message || "Edge Function error"));
    throw new Error(msg);
  }
  return data;
}

const $ = (sel) => document.querySelector(sel);

function setText(id, txt) {
  const el = document.getElementById(id);
  if (el) el.textContent = txt ?? "";
}
function setHTML(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html ?? "";
}

function ensureHelpBreakdownUI() {
  let box = document.getElementById("cmpHelpBreakdown");
  if (box) return box;

  const featureCard = document.querySelector(".featureCard");
  if (!featureCard) return null;

  box = document.createElement("div");
  box.id = "cmpHelpBreakdown";
  box.style.display = "flex";
  box.style.gap = "8px";
  box.style.flexWrap = "wrap";
  box.style.marginTop = "14px";

  box.innerHTML = `
    <span id="buyHelpCountPill" class="miniPill">${t("buyHelpCount")}: 0</span>
    <span id="quizHelpCountPill" class="miniPill">${t("quizHelpCount")}: 0</span>
    <span id="totalHelpCountPill" class="miniPill">${t("totalHelpCount")}: 0</span>
  `;

  featureCard.appendChild(box);
  return box;
}

function renderHelpBreakdown(purchaseCount = 0, quizCount = 0) {
  ensureHelpBreakdownUI();
  setText("buyHelpCountPill", `${t("buyHelpCount")}: ${purchaseCount}`);
  setText("quizHelpCountPill", `${t("quizHelpCount")}: ${quizCount}`);
  setText("totalHelpCountPill", `${t("totalHelpCount")}: ${Number(purchaseCount || 0) + Number(quizCount || 0)}`);
}

function notice(msg, kind = "ok") {
  if (window.__cmpLateBlocked && kind !== "err") return;
  const box = document.getElementById("notice");
  if (!box) return;
  box.className = "notice " + (kind === "err" ? "err" : kind === "warn" ? "warn" : "ok");
  box.style.display = "block";
  box.textContent = msg;
  clearTimeout(window.__cmpNoticeT);
  window.__cmpNoticeT = setTimeout(() => {
    box.style.display = "none";
  }, 4500);
}

// If we return from Stripe success_url, verify the session and grant HELP.
async function maybeVerifyStripeReturn(session) {
  try {
    const url = new URL(window.location.href);
    const paid = url.searchParams.get("paid");
    const sessionId = url.searchParams.get("session_id");
    const contestCode = url.searchParams.get("contest_code") || url.searchParams.get("code");

    if (paid === "1" && sessionId && contestCode) {
      notice("⏳ Επιβεβαίωση πληρωμής…", "warn");
      await callEdgeFunction(
        "verify-checkout",
        { session_id: sessionId, contest_code: contestCode },
        session.access_token,
      );

      // Remove params so refresh doesn't re-verify
      url.searchParams.delete("paid");
      url.searchParams.delete("session_id");
      window.history.replaceState({}, "", url.toString());

      notice("✅ Η αγορά HELP ολοκληρώθηκε και ενεργοποιήθηκε.", "ok");
      return true;
    }
  } catch (e) {
    console.warn("verify-checkout failed", e);
    notice(`⚠️ Η πληρωμή έγινε, αλλά δεν ενεργοποιήθηκε το HELP: ${e?.message || e}`, "err");
  }
  return false;
}


function parseISO(s) {
  if (!s) return null;
  // Accept "YYYY-MM-DDTHH:mm" (no seconds) or full ISO.
  // If no timezone, treat as local time.
  try {
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) {
      const [d, t] = s.split("T");
      const [Y, M, D] = d.split("-").map(Number);
      const [h, m] = t.split(":").map(Number);
      return new Date(Y, M - 1, D, h, m, 0, 0);
    }
    return new Date(s);
  } catch {
    return null;
  }
}

function fmtLocal(dt) {
  if (!dt || isNaN(dt.getTime())) return "";
  try {
    return dt.toLocaleString(currentLang === "en" ? "en-GB" : "el-GR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch {
    return dt.toISOString();
  }
}

function msUntil(dt) {
  if (!dt || isNaN(dt.getTime())) return 0;
  return dt.getTime() - Date.now();
}

function setCountdown(deadlineDate) {
  const pill = document.getElementById("deadlineInfo");
  if (!pill) return;

  // Αν περάσει το deadline ενώ ο χρήστης είναι στη σελίδα, κλείδωσε το UI αμέσως.
  // Η applyLockUI ορίζεται πιο κάτω — την εκθέτουμε στο window ως hook.
  function lockNowIfPossible() {
    try {
      if (typeof window.__cmpApplyLockUI === "function") window.__cmpApplyLockUI(true);
    } catch {}
  }

  function tick() {
    const ms = msUntil(deadlineDate);
    if (ms <= 0) {
      dashboardState.deadlineText = `${fmtLocal(deadlineDate)} • ⏳ 00:00:00`;
      pill.textContent = `${t("deadline")}: ${dashboardState.deadlineText}`;
      lockNowIfPossible();
      return;
    }
    const total = Math.floor(ms / 1000);
    const h = String(Math.floor(total / 3600)).padStart(2, "0");
    const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
    const s = String(total % 60).padStart(2, "0");
    dashboardState.deadlineText = `${fmtLocal(deadlineDate)} • ⏳ ${h}:${m}:${s}`;
    pill.textContent = `${t("deadline")}: ${dashboardState.deadlineText}`;
    requestAnimationFrame(() => {}); // keep UI responsive
    setTimeout(tick, 1000);
  }
  tick();
}

async function safeGetProfile(userId) {
  // Some projects may not have profiles.is_admin or profiles.help_credits columns -> avoid breaking.
  const base = supabase.from("profiles");

  // Try the richest select first
  let res = await base.select("id, username, is_admin, help_credits").eq("id", userId).maybeSingle();

  // Fallback if is_admin column missing
  if (res.error && String(res.error.message || "").includes("is_admin")) {
    res = await base.select("id, username, help_credits").eq("id", userId).maybeSingle();
  }

  // Fallback if help_credits column missing
  if (res.error && String(res.error.message || "").includes("help_credits")) {
    // Try with is_admin only
    res = await base.select("id, username, is_admin").eq("id", userId).maybeSingle();
    if (res.error && String(res.error.message || "").includes("is_admin")) {
      res = await base.select("id, username").eq("id", userId).maybeSingle();
    }
  }

  if (res.error) return { username: "user", is_admin: false, help_credits: 0 };

  return {
    username: res.data?.username ?? "user",
    is_admin: !!res.data?.is_admin,
    help_credits: Number(res.data?.help_credits ?? 0),
  };
}
function isDeadlinePassed(deadlineIso) {
  const d = parseISO(deadlineIso);
  if (!d) return false;
  return Date.now() >= d.getTime();
}

function matchTitle(m) {
  const h = m.home ?? m.h ?? "Home";
  const a = m.away ?? m.a ?? "Away";
  return `${h} vs ${a}`;
}

function buildMatchRow(match, pick, disabled) {
  const div = document.createElement("div");
  div.className = "match";
  if (disabled) div.classList.add("locked");

  const left = document.createElement("div");
  left.className = "matchLeft";

  const title = document.createElement("div");
  title.className = "matchTitle";
  title.textContent = matchTitle(match);

  const time = document.createElement("div");
  time.className = "matchTime";
  const dt = parseISO(match.startISO || match.start_iso || match.kickoff || match.kickoff_iso);
  time.textContent = dt ? fmtLocal(dt) : "";

  left.appendChild(title);
  left.appendChild(time);

  const right = document.createElement("div");
  right.className = "matchRight";

  const metaRow = document.createElement("div");
  metaRow.className = "matchMeta";

  const actionsRow = document.createElement("div");
  actionsRow.className = "matchActions";

  const sel = document.createElement("select");
  sel.dataset.matchId = match.id;
  sel.innerHTML = `
    <option value="">${t("pickPlaceholder")}</option>
    <option value="1">1</option>
    <option value="X">X</option>
    <option value="2">2</option>
  `;
  sel.value = pick ?? "";
  sel.disabled = !!disabled;

  const finalEl = document.createElement("span");
  finalEl.className = "mini";
  finalEl.style.opacity = "0.9";
  finalEl.textContent = `${t("final")}: —`;

  const statusEl = document.createElement("span");
  statusEl.className = "mini";
  statusEl.style.fontWeight = "700";
  statusEl.textContent = "";

  const btn = document.createElement("button");
  btn.className = "btn";
  btn.style.padding = "8px 12px";
  btn.textContent = t("save");
  btn.dataset.matchId = match.id;
  btn.disabled = !!disabled;

  const helpBtn = document.createElement("button");
  helpBtn.className = "btn";
  helpBtn.style.padding = "8px 10px";
  helpBtn.textContent = t("help");
  helpBtn.dataset.matchId = match.id;
  helpBtn.disabled = !!disabled;

  metaRow.appendChild(sel);
  metaRow.appendChild(finalEl);
  metaRow.appendChild(statusEl);

  actionsRow.appendChild(helpBtn);
  actionsRow.appendChild(btn);

  right.appendChild(metaRow);
  right.appendChild(actionsRow);

  div.appendChild(left);
  div.appendChild(right);

  return { row: div, sel, btn, helpBtn, finalEl, statusEl };
}

async function main() {
  await ensureSupabaseConfig();

  // Guard: must be logged in
  const { data: sessData, error: sessErr } = await supabase.auth.getSession();
  if (sessErr || !sessData?.session?.user) {
    location.href = "login.html";
    return;
  }
  const user = sessData.session.user;


  // If returning from Stripe, verify payment and grant HELP before loading UI/state
  await maybeVerifyStripeReturn(sessData.session);
  // Wire logout
  const lo = document.getElementById("lo");
  if (lo) {
    lo.addEventListener("click", async () => {
      await supabase.auth.signOut();
      location.href = "login.html";
    });
  }

  const profile = await safeGetProfile(user.id);
  dashboardState.username = profile.username;
  setText("userPill", `${t("user")}: ${profile.username}`);

  // Admin shortcut if available
  if (profile.is_admin) {
    const adminLink = document.getElementById("adminLink");
    if (adminLink) adminLink.style.display = "inline-flex";
  }

  // Load active contest
  const contestRes = await supabase
    .from("contests")
	  .select("id, code, active, current_round, starts_at, locked, deadline_iso, matches, status, published, meta, created_at")
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (contestRes.error) {
    console.error(contestRes.error);
    notice("Σφάλμα φόρτωσης διαγωνισμού", "err");
    return;
  }
  const contest = contestRes.data;
  if (!contest) {
    setText("contestInfo", "Contest: -");
    setText("roundInfo", "Αγωνιστική: -");
    notice("Δεν υπάρχει ενεργός διαγωνισμός", "warn");
    return;
  }

  const code = contest.code;
  const round = Number(contest.current_round ?? 1);

  dashboardState.code = code;
  dashboardState.round = round;
  setText("contestInfo", `Contest: ${code}`);
  setText("roundInfo", `${t("round")}: ${round}`);

	// Final Week flag (stored in contests.meta.finalWeek)
	try {
		const fw = contest?.meta?.finalWeek === true;
		const el = document.getElementById("finalWeekPill");
		if (el) el.style.display = fw ? "inline-flex" : "none";
	} catch (e) {
		/* no-op */
	}


  // LATE JOIN GUARD (SAFE):
  // Στόχος: όσοι είχαν λογαριασμό ΠΡΙΝ ξεκινήσει ο διαγωνισμός παίζουν.
  // Όσοι κάνουν signup ΜΕΤΑ, βλέπουν μήνυμα και όλα disabled.
  //
  // Χρησιμοποιούμε profiles.created_at (backfilled από auth.users.created_at) ως αξιόπιστο timestamp.
  // Προαιρετικά, αν κάποιος είναι ήδη στο contest_participants, θεωρείται επιτρεπτός.
  let lateBlocked = false;
  try {
    const startsAt = contest.starts_at ? new Date(contest.starts_at) : null;
    const startedOrLocked =
      (startsAt && new Date() >= startsAt) ||
      contest.locked === true ||
      String(contest.status || "").toUpperCase() === "LOCKED";

    if (startedOrLocked && startsAt && !isNaN(startsAt.getTime())) {
      // 1) Πάρε created_at του χρήστη (profiles)
      const profRes = await supabase
        .from("profiles")
        .select("created_at")
        .eq("id", user.id)
        .maybeSingle();

      const userCreatedAt = profRes?.data?.created_at ? new Date(profRes.data.created_at) : null;

      // 2) Προαιρετικά: αν είναι ήδη participant, άσε τον να παίξει
      let isParticipant = false;
      const partRes = await supabase
        .from("contest_participants")
        .select("id")
        .eq("contest_id", contest.id)
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (!partRes?.error && !!partRes?.data) isParticipant = true;

      // 3) Late rule:
      // Αν ΔΕΝ έχουμε created_at (π.χ. δεν έτρεξε το SQL backfill ακόμα), ΔΕΝ μπλοκάρουμε κανέναν (safe).
      // Αν created_at υπάρχει και είναι ΜΕΤΑ το starts_at και δεν είναι participant -> μπλοκάρουμε.
      if (userCreatedAt && !isNaN(userCreatedAt.getTime())) {
        if (userCreatedAt.getTime() > startsAt.getTime() && !isParticipant) {
          lateBlocked = true;
          window.__cmpLateBlocked = true;

          // Persistent banner (χωρίς auto-hide)
          const box = document.getElementById("notice");
          if (box) {
            box.className = "notice warn";
            box.style.display = "block";
            box.textContent = "⛔ Ο διαγωνισμός ξεκίνησε. Θα ενημερώσουμε για τον επόμενο 🙌";
            try { clearTimeout(window.__cmpNoticeT); } catch {}
          }
        }
      }
    }
  } catch (e) {
    console.warn("Late guard check failed:", e);
  }
  window.__cmpDeadlineIso = contest.deadline_iso || "";
  const deadlineDate = parseISO(contest.deadline_iso);
  if (deadlineDate) setCountdown(deadlineDate);
  else { dashboardState.deadlineText = "-"; setText("deadlineInfo", `${t("deadline")}: -`); }

  const deadlinePassed = isDeadlinePassed(contest.deadline_iso);


// Load HELP purchase (ONE per contest) + usage per match
const helpRes = await supabase
  .from("help_purchases")
  .select("remaining, used_match_ids")
  .eq("user_id", user.id)
  .eq("contest_code", code)
  .maybeSingle();

const quizHelpRes = await supabase
  .from("quiz_help_rewards")
  .select("amount, contest_code")
  .eq("user_id", user.id)
  .eq("contest_code", code);

if (quizHelpRes.error) {
  console.warn("quiz_help_rewards load error:", quizHelpRes.error);
}

const quizHelpCount = Array.isArray(quizHelpRes.data)
  ? quizHelpRes.data.reduce((sum, row) => sum + (Number(row.amount) || 0), 0)
  : 0;

// IMPORTANT:
// - If a help_purchases row exists for this contest, its `remaining` is the real available balance.
// - If no help_purchases row exists yet, but quiz rewards exist, allow those quiz helps to be used.
const remainingFromPurchase = (() => {
  const v = helpRes.data?.remaining;
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
})();

const totalAvailableHelp = remainingFromPurchase !== null
  ? remainingFromPurchase
  : quizHelpCount;

const helpState = {
  remaining: Number(totalAvailableHelp || 0),
  used: Array.isArray(helpRes.data?.used_match_ids) ? helpRes.data.used_match_ids : [],
};

const getPurchaseHelpCount = () => {
  if (!helpRes.data) return 0;
  return Math.max(Number(helpState.remaining || 0) - Number(quizHelpCount || 0), 0);
};

renderHelpBreakdown(getPurchaseHelpCount(), quizHelpCount);

  // Load user lock state
  const lockRes = await supabase
    .from("user_round_locks")
    .select("locked, locked_at")
    .eq("user_id", user.id)
    .eq("contest_code", code)
    .eq("round", round)
    .maybeSingle();

  let isLocked = false;
  if (lockRes.data?.locked) isLocked = true;
  if (deadlinePassed) isLocked = true;

  const statusPill = document.getElementById("statusPill");
  if (statusPill) {
    dashboardState.locked = !!isLocked;
    statusPill.textContent = `${t("status")}: ${isLocked ? t("statusLocked") : t("statusOpen")}`;
  }

  // Load existing predictions
  const predsRes = await supabase
    .from("predictions")
    .select("match_id, pick")
    .eq("user_id", user.id)
    .eq("contest_code", code)
    .eq("round", round);

  if (predsRes.error) {
    console.error(predsRes.error);
    notice("Σφάλμα φόρτωσης προβλέψεων", "err");
  }

  refreshDashboardLabels();

  const predMap = new Map();
  (predsRes.data || []).forEach((p) => predMap.set(p.match_id, p.pick));


// Load match results (for "Τελικό" + status display)
const mrRes = await supabase
  .from("match_results")
  .select("match_id, result, is_off")
  .eq("contest_code", code)
  .eq("round", round);

if (mrRes.error) {
  console.warn("match_results load error:", mrRes.error);
}

const resultMap = new Map();
(mrRes.data || []).forEach((r) => {
  resultMap.set(String(r.match_id), {
    result: r.result ?? null,
    is_off: !!r.is_off,
  });
});

function computeFinalAndStatus(matchId, pickVal) {
  const mr = resultMap.get(String(matchId));
  const helpUsed = helpState.used.includes(String(matchId));

  if (!mr) return { finalText: `${t("final")}: —`, statusText: "", kind: "" };

  if (mr.is_off) {
    return {
      finalText: `${t("final")}: OFF`,
      statusText: helpUsed ? t("correct") : t("wrong"),
      kind: helpUsed ? "ok" : "bad",
    };
  }

  if (!mr.result) {
    return {
      finalText: `${t("final")}: —`,
      statusText: helpUsed ? "HELP" : "",
      kind: helpUsed ? "info" : "",
    };
  }

  const isCorrect = helpUsed || (pickVal && String(pickVal) === String(mr.result));
  return {
    finalText: `${t("final")}: ${mr.result}`,
    statusText: pickVal ? (isCorrect ? t("correct") : t("wrong")) : "",
    kind: pickVal ? (isCorrect ? "ok" : "bad") : "",
  };
}

  // Render matches
  const matchesBox = document.getElementById("matches");
  if (!matchesBox) return;
  matchesBox.innerHTML = "";

  const matches = Array.isArray(contest.matches) ? contest.matches : [];
  if (!matches.length) {
    matchesBox.innerHTML = `<div class="mini">❌ Δεν υπάρχουν αγώνες.</div>`;
    return;
  }

  // Debounced autosave per match
  const pending = new Map();

  async function upsertPrediction(matchId, pickVal) {
    if (lateBlocked || isLocked) {
      notice("Οι προβλέψεις είναι κλειδωμένες.", "warn");
      return { ok: false };
    }
    if (!lateBlocked && deadlinePassed) {
      notice("Πέρασε το deadline. Δεν μπορείς να αλλάξεις πρόβλεψη.", "warn");
      return { ok: false };
    }
    const payload = {
      user_id: user.id,
      contest_code: code,
      round,
      match_id: matchId,
      pick: pickVal || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("predictions")
      .upsert(payload, { onConflict: "user_id,contest_code,round,match_id" });

    if (error) {
      console.error(error);
      notice("Αποτυχία αποθήκευσης πρόβλεψης.", "err");
      return { ok: false, error };
    }
    if (pickVal) predMap.set(matchId, pickVal);
    else predMap.delete(matchId);
    return { ok: true };
  }

  function scheduleAutosave(matchId, pickVal, btnEl) {
    if (pending.has(matchId)) clearTimeout(pending.get(matchId));
    if (btnEl) {
      btnEl.textContent = "Saving…";
      btnEl.disabled = true;
    }
    pending.set(
      matchId,
      setTimeout(async () => {
        const res = await upsertPrediction(matchId, pickVal);
        if (btnEl) {
          btnEl.textContent = res.ok ? "Saved" : "Save";
          btnEl.disabled = !!isLocked;
          if (res.ok) setTimeout(() => (btnEl.textContent = "Save"), 900);
        }
        if (res.ok) notice("✅ Αποθηκεύτηκε", "ok");
      }, 350)
    );
  }

  for (const m of matches) {
    const matchId = m.id;
    const existingPick = predMap.get(matchId) ?? "";
    const { row, sel, btn, helpBtn, finalEl, statusEl } = buildMatchRow(m, existingPick, isLocked || deadlinePassed || lateBlocked);

    function refreshOutcome() {
      const v = sel.value || "";
      const o = computeFinalAndStatus(matchId, v);
      if (finalEl) finalEl.textContent = o.finalText || "Τελικό: —";
      if (statusEl) {
        statusEl.textContent = o.statusText || "";
        statusEl.style.padding = o.statusText ? "2px 6px" : "0";
        statusEl.style.borderRadius = "999px";
        statusEl.style.border = o.statusText ? "1px solid rgba(255,255,255,.14)" : "none";
        if (o.kind === "ok") statusEl.style.background = "rgba(46,204,113,.18)";
        else if (o.kind === "bad") statusEl.style.background = "rgba(231,76,60,.16)";
        else if (o.kind === "info") statusEl.style.background = "rgba(52,152,219,.14)";
        else statusEl.style.background = "transparent";
      }
    }

    refreshOutcome();

    sel.addEventListener("change", () => {
      const v = sel.value || "";
      scheduleAutosave(matchId, v, btn);
      refreshOutcome();
    });

    btn.addEventListener("click", () => {
      const v = sel.value || "";
      scheduleAutosave(matchId, v, btn);
      refreshOutcome();
    });


// HELP toggle per match (guarantees +1 point for this match no matter result/off)
function renderHelpBtn() {
  const used = helpState.used.includes(matchId);
  if (used) {
    helpBtn.textContent = "HELP ✓";
    helpBtn.style.background = "rgba(52,152,219,.25)";
    helpBtn.style.borderColor = "rgba(52,152,219,.55)";
  } else {
    helpBtn.textContent = t("help");
    helpBtn.style.background = "";
    helpBtn.style.borderColor = "";
  }
  helpBtn.disabled = !!isLocked || !!deadlinePassed || (!used && helpState.remaining <= 0);
  helpBtn.title = (!used && helpState.remaining <= 0) ? "Δεν έχεις άλλα HELP διαθέσιμα." : "";
}

async function persistHelpState() {
  // Upsert ONE per contest
  const payload = {
    user_id: user.id,
    contest_code: code,
    purchased_at: new Date().toISOString(),
    remaining: helpState.remaining,
    used_match_ids: helpState.used,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase
    .from("help_purchases")
    .upsert(payload, { onConflict: "user_id,contest_code" });
  if (error) {
    console.error(error);
    notice("❌ Σφάλμα αποθήκευσης HELP.", "err");
    return false;
  }
  return true;
}

helpBtn.addEventListener("click", async () => {
  if (isLocked || deadlinePassed) {
    notice("🔒 Δεν μπορείς να αλλάξεις HELP μετά το κλείδωμα.", "warn");
    return;
  }

  const used = helpState.used.includes(matchId);
  if (!used && helpState.remaining <= 0) {
    notice("Δεν έχεις άλλα HELP διαθέσιμα.", "warn");
    return;
  }

  // toggle
  if (used) {
    helpState.used = helpState.used.filter((x) => x !== matchId);
    helpState.remaining += 1;
  } else {
    helpState.used.push(matchId);
    helpState.remaining -= 1;
  }

  const ok = await persistHelpState();
  if (ok) notice(used ? "↩️ Αφαιρέθηκε HELP από τον αγώνα." : "✅ Έβαλες HELP στον αγώνα.", "ok");
  renderHelpBtn();
  renderHelpBreakdown(getPurchaseHelpCount(), quizHelpCount);
  refreshOutcome();
});

renderHelpBtn();

    matchesBox.appendChild(row);
  }

// HELP purchase button (ONE per contest)
const buyBtn = document.getElementById("buyBtn");
if (buyBtn) {
  const alreadyBought = !!helpRes.data;
  buyBtn.disabled = alreadyBought || lateBlocked;
  if (lateBlocked) {
    buyBtn.textContent = "⛔ Ο διαγωνισμός ξεκίνησε";
  } else {
    buyBtn.textContent = alreadyBought ? `✅ HELP ενεργό (${helpState.remaining} διαθέσιμα)` : "🧠 Αγορά HELP (€1,99)";
  }

  renderHelpBreakdown(getPurchaseHelpCount(), quizHelpCount);

buyBtn.addEventListener("click", () => {
    // Guards (same rules as before)
    if (lateBlocked) {
      notice("⛔ Ο διαγωνισμός ξεκίνησε — δεν μπορείς να αγοράσεις.", "warn");
      return;
    }
    if (deadlinePassed || isLocked) {
      notice("🔒 Δεν μπορείς να αγοράσεις HELP μετά το κλείδωμα/deadline.", "warn");
      return;
    }
    // Payment flow happens in pay.html (Stripe-ready). No secrets in frontend.
    // Pass contest_code so pay.html can start checkout reliably.
    try { localStorage.setItem("contestCode", String(code || "")); } catch {}
    location.href = `pay.html?contest_code=${encodeURIComponent(String(code || ""))}`;
  });
}


  // LOCK button
  const lockBtn = document.getElementById("lockBtn");
  // Apply lock UI state (persist after refresh)
  function applyLockUI(locked) {
    if (!lockBtn) return;
    if (locked) {
      lockBtn.disabled = true;
      lockBtn.classList.add("locked");
      lockBtn.setAttribute("aria-pressed", "true");
      lockBtn.textContent = t("statusLocked");
      // Visual cue: change color when locked
      lockBtn.style.opacity = "1";
      lockBtn.style.background = "rgba(231, 76, 60, 0.35)";
      lockBtn.style.borderColor = "rgba(231, 76, 60, 0.6)";
      // disable all picks + save buttons when locked
      document.querySelectorAll("#matches select").forEach((el) => (el.disabled = true));
      document.querySelectorAll("#matches button").forEach((el) => (el.disabled = true));

      // make match rows + picks visibly red (like admin finals)
      document.querySelectorAll("#matches .match").forEach((el) => el.classList.add("locked"));
      document.querySelectorAll("#matches select").forEach((el) => el.classList.add("lockedPick"));
    } else {
      lockBtn.disabled = false;
      lockBtn.classList.remove("locked");
      lockBtn.setAttribute("aria-pressed", "false");
      lockBtn.textContent = t("lockPreds");
      lockBtn.style.background = "";
      lockBtn.style.borderColor = "";

      document.querySelectorAll("#matches .match").forEach((el) => el.classList.remove("locked"));
      document.querySelectorAll("#matches select").forEach((el) => el.classList.remove("lockedPick"));
    }
  }

  // Expose for countdown hook (when deadline passes while staying on page)
  window.__cmpApplyLockUI = applyLockUI;

  // ensure UI matches backend lock state on load
  // Treat deadlinePassed as locked UI as well (same red style)
  applyLockUI(isLocked || lateBlocked || deadlinePassed);
  refreshDashboardLabels();

  // Late users: κρατάμε το dashboard αλλά όλα disabled
  if (lateBlocked && lockBtn) {
    lockBtn.disabled = true;
  }


  if (lockBtn) {
    lockBtn.disabled = lateBlocked || deadlinePassed;
    lockBtn.addEventListener("click", async () => {
      // Double confirmation only (do NOT block if some picks are missing)
      if (!confirm("Για ασφάλεια: Είσαι σίγουρος ότι πρόβλεψες σε ΟΛΑ τα παιχνίδια;")) return;
      if (!confirm("Είσαι σίγουρος; Να κλειδώσω τις προβλέψεις σου τώρα;")) return;
      if (lateBlocked) {
        notice("⛔ Ο διαγωνισμός έχει ήδη ξεκινήσει. Θα ενημερώσουμε για τον επόμενο.", "warn");
        applyLockUI(true);
        return;
      }

      if (lateBlocked || isLocked) {
        notice("Ήδη κλειδωμένες.", "warn");
        applyLockUI(true);
        return;
      }
      if (!lateBlocked && deadlinePassed) {
        notice("Πέρασε το deadline. Κλείδωμα αυτόματα.", "warn");
        return;
      }
      try {
        const { error } = await supabase.from("user_round_locks").upsert(
          {
            user_id: user.id,
            contest_code: code,
            round,
            locked: true,
            locked_at: new Date().toISOString(),
          },
          { onConflict: "user_id,contest_code,round" }
        );
        if (error) throw error;
        isLocked = true;
        dashboardState.locked = true;
        if (statusPill) statusPill.textContent = `${t("status")}: ${t("statusLocked")}`;
        applyLockUI(true);
        notice("🔒 Κλείδωσες τις προβλέψεις σου!", "ok");
      } catch (e) {
        console.error(e);
        notice("❌ Αποτυχία κλειδώματος.", "err");
      }
    });
  }

  if (!lateBlocked && deadlinePassed) {
    notice("⏳ Έληξε το deadline. Οι προβλέψεις είναι κλειδωμένες.", "warn");
  }
}

const langToggleBtn = document.getElementById("langToggle");
if (langToggleBtn) {
  langToggleBtn.addEventListener("click", () => {
    currentLang = currentLang === "el" ? "en" : "el";
    localStorage.setItem(DASH_LANG_KEY, currentLang);
    refreshDashboardLabels();
    try { setCountdown(parseISO(window.__cmpDeadlineIso)); } catch {}
  });
}

const installBtnEl = document.getElementById("installBtn");
const isiOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
if (isiOS) {
  const iosHint = document.getElementById("iphoneInstall");
  if (iosHint) iosHint.classList.add("show");
}
if (installBtnEl) {
  installBtnEl.addEventListener("click", async () => {
    const promptEvt = window.__cmpDeferredPrompt;
    if (promptEvt) {
      promptEvt.prompt();
      try { await promptEvt.userChoice; } catch {}
      window.__cmpDeferredPrompt = null;
      installBtnEl.style.display = "none";
      return;
    }
    alert(t("installFallback"));
  });
}
window.addEventListener("appinstalled", () => {
  if (installBtnEl) installBtnEl.style.display = "none";
});

main().catch((e) => {
  console.error(e);
  try {
    const box = document.getElementById("notice");
    if (box) {
      box.style.display = "block";
      box.className = "notice err";
      box.textContent = "Fatal error (δες Console).";
    }
  } catch {}
});