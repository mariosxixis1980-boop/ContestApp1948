import { supabase } from './supabase.js';

const LB_LANG_KEY = 'CMP_LANG';
function getLang(){ return localStorage.getItem(LB_LANG_KEY) === 'en' ? 'en' : 'el'; }
let currentLang = getLang();
function setLang(lang){ localStorage.setItem(LB_LANG_KEY, lang === 'en' ? 'en' : 'el'); location.reload(); }
const LB_I18N = {
  el: { title:'Κατάταξη', sub:'Cyprus Match Predict • Μόνο ο ενεργός διαγωνισμός', myPos:'Η θέση σου', loadingContest:'Φόρτωση διαγωνισμού…', backDash:'← Πίσω στο Dashboard', tieHint:'<strong>Κριτήρια ισοβαθμίας:</strong> Πόντοι → Μπόνους → Καλύτερο σερί μπόνους → Γύροι με 1 λάθος', emptyHint:'Αν δεν υπάρχουν δεδομένα ακόμα, περίμενε να μπουν αποτελέσματα αγώνων.', liveBadge:'Live από Supabase', player:'Παίκτης', points:'Πόντοι', bonus:'Μπόνους', streak:'Καλύτερο σερί', oneWrong:'Γύροι 1 λάθος', prizeTitle:'🎁 Δώρο Διαγωνισμού', goodLuck:'Καλή επιτυχία και καλή διασκέδαση', foot:'* «Μπόνους» = πόσες φορές πήρες τα +2. «Καλύτερο σερί» = συνεχόμενες φορές που πήρες μπόνους.', noActive:'Δεν υπάρχει ενεργός διαγωνισμός', loadContestErr:'Σφάλμα φόρτωσης διαγωνισμού', noData:'Δεν υπάρχουν δεδομένα ακόμα.', rankEmpty:'Η θέση σου: —', rankVal:'Η θέση σου: #{rank}', winner:'🏆 <b>Συγχαρητήρια!</b> Είσαι ο Νικητής του διαγωνισμού.', lbError:'Σφάλμα φόρτωσης leaderboard', contest:'Contest', round:'Αγωνιστική', aria:'Πίνακας Κατάταξης' },
  en: { title:'Leaderboard', sub:'Cyprus Match Predict • Active contest only', myPos:'Your position', loadingContest:'Loading contest…', backDash:'← Back to Dashboard', tieHint:'<strong>Tie-break criteria:</strong> Points → Bonus → Best bonus streak → Rounds with 1 wrong', emptyHint:'If there is no data yet, wait until match results are entered.', liveBadge:'Live from Supabase', player:'Player', points:'Points', bonus:'Bonus', streak:'Best streak', oneWrong:'Rounds with 1 wrong', prizeTitle:'🎁 Contest Prize', goodLuck:'Good luck and have fun', foot:'* “Bonus” = how many times you got the +2. “Best streak” = consecutive times you got bonus.', noActive:'No active contest', loadContestErr:'Failed to load contest', noData:'No data yet.', rankEmpty:'Your position: —', rankVal:'Your position: #{rank}', winner:'🏆 <b>Congratulations!</b> You are the contest winner.', lbError:'Failed to load leaderboard', contest:'Contest', round:'Round', aria:'Leaderboard table' }
};
function t(key, vars={}){ const s=(LB_I18N[currentLang]&&LB_I18N[currentLang][key])||LB_I18N.el[key]||key; return s.replace(/#\{(\w+)\}/g, (_,k)=> vars[k] ?? ''); }
function applyLeaderboardStaticTexts(){
  const set=(id,key,html=false)=>{ const el=document.getElementById(id); if(!el) return; if(html) el.innerHTML=t(key); else el.textContent=t(key); };
  set('lbTitle','title'); set('lbSub','sub'); set('backDashBtn','backDash'); set('tieHint','tieHint',true); set('emptyHint','emptyHint'); set('liveBadgeText','liveBadge'); set('thPlayer','player'); set('thPoints','points'); set('thBonus','bonus'); set('thStreak','streak'); set('thOneWrong','oneWrong'); set('prizeTitle','prizeTitle'); set('goodLuckText','goodLuck'); set('footNote','foot');
  const my=document.getElementById('myRankPill'); if(my && !my.dataset.dynamic) my.textContent=t('rankEmpty');
  const cp=document.getElementById('contestPill'); if(cp && !cp.dataset.dynamic) cp.textContent=t('loadingContest');
  const tbl=document.getElementById('leaderboardTable'); if(tbl) tbl.setAttribute('aria-label', t('aria'));
  const elb=document.getElementById('lbLangEl'); const enb=document.getElementById('lbLangEn'); if(elb) elb.onclick=()=>setLang('el'); if(enb) enb.onclick=()=>setLang('en');
}
applyLeaderboardStaticTexts();

function setError(msg, details) {
  const box = document.getElementById('errBox');
  if (!box) return;
  box.style.display = 'block';
  box.textContent = details ? `${msg}: ${details}` : msg;
}


function renderPrizeAndGoodLuck() {
  const contest = window.__activeContest;
  const prizeBox = document.getElementById('prizeBox');
  const prizeText = document.getElementById('prizeText');
  const goodLuckBox = document.getElementById('goodLuckBox');
  if (!prizeBox || !prizeText || !goodLuckBox) return;

  const meta = (contest && typeof contest.meta === 'object') ? contest.meta : {};
  const prize =
    (meta.prizeText ?? meta.prize ?? meta.gift ?? meta.reward ?? meta.doro ?? meta.doroText ?? '').toString().trim();

  // Show whenever there is a prize text (leaderboard is the right place for it).
  const show = !!prize;

  prizeBox.style.display = show ? 'block' : 'none';
  goodLuckBox.style.display = show ? 'block' : 'none';
  if (show) prizeText.textContent = prize;
}

async function loadActiveContestPill() {
  try {
    const { data, error } = await supabase
      .from('contests')
	      .select('code, title, current_round, status, locked, active, meta')
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

	    // keep full contest object available for winner logic
	    window.__activeContest = data || null;
	    renderPrizeAndGoodLuck();

	    const pill = document.getElementById('contestPill');
    if (!pill) return;

    if (!data) {
      pill.textContent = t('noActive');
      return;
    }

    const roundTxt = (data.current_round ?? null) !== null ? `• ${t('round')}: ${data.current_round}` : '';
    const titleTxt = data.title ? `• ${data.title}` : '';
    pill.textContent = `${t('contest')}: ${data.code} ${roundTxt} ${titleTxt}`.replace(/\s+/g, ' ').trim(); pill.dataset.dynamic='1';
  } catch (e) {
    console.error('Active contest pill error:', e);
    const pill = document.getElementById('contestPill');
    if (pill) pill.textContent = t('loadContestErr');
  }
}

async function loadLeaderboard() {
  try {
    const activeContest = window.__activeContest || null;
    const activeCode = activeContest?.code || null;

    const { data, error } = await supabase
      .from('leaderboard_active_named_v')
      .select('*');

    if (error) throw error;

    let bonusMap = new Map();

    if (activeCode) {
      const { data: bonusRows, error: bonusError } = await supabase
        .from('contest_participants')
        .select('user_id, late_join_bonus')
        .eq('contest_code', activeCode);

      if (bonusError) {
        console.warn('Late join bonus load error:', bonusError);
      } else {
        (bonusRows || []).forEach((row) => {
          bonusMap.set(String(row.user_id), Number(row.late_join_bonus || 0));
        });
      }
    }

    const merged = (data || []).map((row) => {
      const lateBonus = bonusMap.get(String(row.user_id || '')) || 0;
      return {
        ...row,
        late_join_bonus: lateBonus,
        total_points: Number(row.total_points ?? 0) + lateBonus
      };
    });

    merged.sort((a, b) => {
      const p = Number(b.total_points ?? 0) - Number(a.total_points ?? 0);
      if (p !== 0) return p;

      const bonus = Number(b.bonus_count ?? 0) - Number(a.bonus_count ?? 0);
      if (bonus !== 0) return bonus;

      const streak = Number(b.longest_bonus_streak ?? 0) - Number(a.longest_bonus_streak ?? 0);
      if (streak !== 0) return streak;

      const oneWrong = Number(b.one_wrong_rounds ?? 0) - Number(a.one_wrong_rounds ?? 0);
      if (oneWrong !== 0) return oneWrong;

      return String(a.username ?? '').localeCompare(String(b.username ?? ''));
    });

    const { data: userData } = await supabase.auth.getUser();
    const myId = userData?.user?.id || null;

    const tableBody = document.querySelector('#leaderboard-body');
    tableBody.innerHTML = '';

    if (!merged || merged.length === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="rank">—</td>
        <td colspan="5">${t('noData')}</td>
      `;
      tableBody.appendChild(tr);

      const pill = document.getElementById('myRankPill');
      if (pill) { pill.textContent = t('rankEmpty'); pill.dataset.dynamic='1'; }
      return;
    }

    let myRank = null;
    let diffAbove = null;
    let diffBelow = null;

    if (myId) {
      const idx = merged.findIndex((r) => String(r.user_id || '') === String(myId));
      if (idx >= 0) {
        myRank = idx + 1;

        const myPoints = Number(merged[idx].total_points ?? 0);

        if (idx > 0) {
          const abovePoints = Number(merged[idx - 1].total_points ?? 0);
          diffAbove = abovePoints - myPoints;
        }

        if (idx < merged.length - 1) {
          const belowPoints = Number(merged[idx + 1].total_points ?? 0);
          diffBelow = myPoints - belowPoints;
        }
      }
    }

    const myPill = document.getElementById('myRankPill');
    if (myPill) {
      if (myRank) {
        let msg = t('rankVal', { rank: myRank });

        if (diffAbove !== null && diffAbove > 0) {
          msg += currentLang === 'en'
            ? ` • ${diffAbove} behind the player above`
            : ` • ${diffAbove} πίσω από τον προηγούμενο`;
        }

        if (diffBelow !== null && diffBelow > 0) {
          msg += currentLang === 'en'
            ? ` • ${diffBelow} ahead of the next player`
            : ` • ${diffBelow} μπροστά από τον επόμενο`;
        }

        myPill.textContent = msg;
      } else {
        myPill.textContent = t('rankEmpty');
      }
      myPill.dataset.dynamic='1';
    }

    try {
      const winnerBox = document.getElementById('winnerBox');
      const contest = window.__activeContest;
      const isFinalWeek = contest?.meta?.finalWeek === true;
      const statusLocked = String(contest?.status || '').toUpperCase() === 'LOCKED';
      const hasResultsLockedFlag = contest?.meta && Object.prototype.hasOwnProperty.call(contest.meta, 'resultsLocked');
      const contestFinished = hasResultsLockedFlag ? (contest?.meta?.resultsLocked === true) : (contest?.locked === true || statusLocked);
      if (winnerBox && isFinalWeek && contestFinished && myId && merged.length) {
        const top = merged[0];
        if (String(top?.user_id || '') === String(myId)) {
          winnerBox.style.display = 'block';
          winnerBox.innerHTML = t('winner');
        } else {
          winnerBox.style.display = 'none';
          winnerBox.textContent = '';
        }
      } else if (winnerBox) {
        winnerBox.style.display = 'none';
        winnerBox.textContent = '';
      }
    } catch (e) {
      // ignore
    }

    merged.forEach((row, index) => {
      const tr = document.createElement('tr');
      if (myId && String(row.user_id || '') === String(myId)) tr.classList.add('me');

      const username = row.username ?? row.email ?? '—';
      const totalPoints = row.total_points ?? 0;
      const bonusCount = row.bonus_count ?? 0;
      const streak = row.longest_bonus_streak ?? 0;
      const oneWrong = row.one_wrong_rounds ?? 0;

      tr.innerHTML = `
        <td class="rank num">${index + 1}</td>
        <td class="player">${username}</td>
        <td class="num">${totalPoints}</td>
        <td class="num">${bonusCount}</td>
        <td class="num">${streak}</td>
        <td class="num">${oneWrong}</td>
      `;

      tableBody.appendChild(tr);
    });
  } catch (e) {
    console.error('Leaderboard load error:', e);
    setError(t('lbError'), e?.message ?? String(e));
  }
}


await loadActiveContestPill();
await loadLeaderboard();
