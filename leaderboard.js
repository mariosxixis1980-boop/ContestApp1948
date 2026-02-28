import { supabase } from './supabase.js';

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
      pill.textContent = 'Δεν υπάρχει ενεργός διαγωνισμός';
      return;
    }

    const roundTxt = (data.current_round ?? null) !== null ? `• Αγωνιστική: ${data.current_round}` : '';
    const titleTxt = data.title ? `• ${data.title}` : '';
    pill.textContent = `Contest: ${data.code} ${roundTxt} ${titleTxt}`.replace(/\s+/g, ' ').trim();
  } catch (e) {
    console.error('Active contest pill error:', e);
    const pill = document.getElementById('contestPill');
    if (pill) pill.textContent = 'Σφάλμα φόρτωσης διαγωνισμού';
  }
}

async function loadLeaderboard() {
  try {
    const { data, error } = await supabase
      .from('leaderboard_active_named_v')
      .select('*')
      .order('total_points', { ascending: false })
      .order('bonus_count', { ascending: false })
      .order('longest_bonus_streak', { ascending: false })
      .order('one_wrong_rounds', { ascending: false })
      .order('username', { ascending: true });

    if (error) throw error;

    const { data: userData } = await supabase.auth.getUser();
    const myId = userData?.user?.id || null;

    const tableBody = document.querySelector('#leaderboard-body');
    tableBody.innerHTML = '';

    if (!data || data.length === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="rank">—</td>
        <td colspan="5">Δεν υπάρχουν δεδομένα ακόμα.</td>
      `;
      tableBody.appendChild(tr);

      const pill = document.getElementById('myRankPill');
      if (pill) pill.textContent = 'Η θέση σου: —';
      return;
    }

    // Compute my rank based on current ordering (display-only)
    let myRank = null;
    if (myId) {
      const idx = data.findIndex((r) => String(r.user_id || '') === String(myId));
      if (idx >= 0) myRank = idx + 1;
    }

    const myPill = document.getElementById('myRankPill');
    if (myPill) myPill.textContent = myRank ? `Η θέση σου: #${myRank}` : 'Η θέση σου: —';

	    // Winner banner (Final Week): show ONLY to the winner when finalWeek is ON and contest is LOCKED
	    try {
	      const winnerBox = document.getElementById('winnerBox');
	      const contest = window.__activeContest;
	      const isFinalWeek = contest?.meta?.finalWeek === true;
	      const statusLocked = String(contest?.status || '').toUpperCase() === 'LOCKED';
	      const hasResultsLockedFlag = contest?.meta && Object.prototype.hasOwnProperty.call(contest.meta, 'resultsLocked');
	      const contestFinished = hasResultsLockedFlag ? (contest?.meta?.resultsLocked === true) : (contest?.locked === true || statusLocked);
	      if (winnerBox && isFinalWeek && contestFinished && myId && data.length) {
	        const top = data[0];
	        if (String(top?.user_id || '') === String(myId)) {
	          winnerBox.style.display = 'block';
	          winnerBox.innerHTML = `🏆 <b>Συγχαρητήρια!</b> Είσαι ο Νικητής του διαγωνισμού.`;
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

    data.forEach((row, index) => {
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
    setError('Σφάλμα φόρτωσης leaderboard', e?.message ?? String(e));
  }
}

await loadActiveContestPill();
await loadLeaderboard();
