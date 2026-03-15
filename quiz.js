const quizClient = window.supabase.createClient(
  "https://qhgdcouuxtcjrlsztvwm.supabase.co",
  "sb_publishable_mRB7RNRcLPF9n1eMjhwa0Q_3ya9qB5q"
);

const questionElement = document.getElementById("question");
const aBtn = document.getElementById("a");
const bBtn = document.getElementById("b");
const cBtn = document.getElementById("c");
const timerElement = document.getElementById("timer");
const progressElement = document.getElementById("progress");

let questions = [];
let currentQuestion = 0;
let score = 0;
let time = 5;
let timer = null;
let currentShuffledAnswers = [];

const RECENT_QUESTIONS_KEY = "cmp_recent_quiz_question_ids";
const RECENT_LIMIT = 30;

aBtn.onclick = () => answer("A");
bBtn.onclick = () => answer("B");
cBtn.onclick = () => answer("C");

startQuiz();

async function startQuiz() {
  try {
    let user = null;

    try {
      const {
        data: { user: sessionUser }
      } = await quizClient.auth.getUser();
      user = sessionUser;
    } catch (err) {
      console.error("Get user error:", err);
    }

    // Αν υπάρχει login, τότε ισχύει το όριο 2 φορές τη μέρα.
    // Αν ΔΕΝ υπάρχει login, παίζει κανονικά για δοκιμή.
    if (user) {
      const { data: todayAttempts, error: attemptsError } =
        await quizClient.rpc("get_today_quiz_attempts", { p_user: user.id });

      if (attemptsError) {
        console.error("Attempts error:", attemptsError);
        questionElement.innerText = "Σφάλμα ελέγχου quiz.";
        return;
      }

      if (todayAttempts >= 2) {
        document.body.innerHTML = `
          <div style="font-family:Arial;background:#0f172a;color:white;text-align:center;padding:40px;min-height:100vh;">
            <h1>Quiz Limit</h1>
            <p style="font-size:20px;">Έπαιξες ήδη 2 φορές σήμερα.</p>
            <p>Έλα ξανά αύριο για να παίξεις πάλι.</p>
          </div>
        `;
        return;
      }
    }

    const recentIds = getRecentQuestionIds();

    const { data, error } = await quizClient.rpc(
      "get_random_quiz_questions",
      { excluded_ids: recentIds }
    );

    if (error) {
      console.error("RPC error:", error);
      questionElement.innerText = "Σφάλμα φόρτωσης ερωτήσεων";
      return;
    }

    if (!data || data.length === 0) {
      questionElement.innerText = "Δεν βρέθηκαν ερωτήσεις";
      return;
    }

    questions = shuffleArray(data);
    currentQuestion = 0;
    score = 0;

    saveRecentQuestionIds(questions.map(q => q.id));

    loadQuestion();

  } catch (err) {
    console.error("Quiz load error:", err);
    questionElement.innerText = "Σφάλμα φόρτωσης quiz";
  }
}

function loadQuestion() {
  clearInterval(timer);

  if (currentQuestion >= questions.length) {
    finishQuiz();
    return;
  }

  resetAnswerButtons();

  const q = questions[currentQuestion];

  progressElement.innerText = `Ερώτηση ${currentQuestion + 1} / ${questions.length}`;
  questionElement.innerText = q.question;

  currentShuffledAnswers = shuffleAnswers([
    { key: "A", text: q.option_a },
    { key: "B", text: q.option_b },
    { key: "C", text: q.option_c }
  ]);

  aBtn.innerText = currentShuffledAnswers[0].text;
  bBtn.innerText = currentShuffledAnswers[1].text;
  cBtn.innerText = currentShuffledAnswers[2].text;

  time = 5;
  timerElement.innerText = "Χρόνος: " + time;

  timer = setInterval(() => {
    time--;
    timerElement.innerText = "Χρόνος: " + time;

    if (time <= 0) {
      clearInterval(timer);
      finishQuiz();
    }
  }, 1000);
}

function shuffleAnswers(arr) {
  const shuffled = [...arr];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

function shuffleArray(arr) {
  const shuffled = [...arr];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

function getRecentQuestionIds() {
  try {
    const stored = localStorage.getItem(RECENT_QUESTIONS_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveRecentQuestionIds(newIds) {
  try {
    const existing = getRecentQuestionIds();
    const merged = [...existing, ...newIds];
    const unique = [...new Set(merged)];
    const trimmed = unique.slice(-RECENT_LIMIT);
    localStorage.setItem(RECENT_QUESTIONS_KEY, JSON.stringify(trimmed));
  } catch {}
}

function resetAnswerButtons() {
  [aBtn, bBtn, cBtn].forEach(btn => {
    btn.disabled = false;
    btn.style.background = "#1d9bf0";
    btn.style.opacity = "1";
  });
}

function answer(choice) {
  const correct = questions[currentQuestion].correct_option;

  clearInterval(timer);

  let selectedKey = "";

  if (choice === "A") selectedKey = currentShuffledAnswers[0].key;
  if (choice === "B") selectedKey = currentShuffledAnswers[1].key;
  if (choice === "C") selectedKey = currentShuffledAnswers[2].key;

  const buttons = [aBtn, bBtn, cBtn];

  buttons.forEach(btn => {
    btn.disabled = true;
    btn.style.opacity = "0.9";
  });

  if (selectedKey === correct) {
    score++;

    if (choice === "A") aBtn.style.background = "#16a34a";
    if (choice === "B") bBtn.style.background = "#16a34a";
    if (choice === "C") cBtn.style.background = "#16a34a";

    setTimeout(() => {
      currentQuestion++;
      loadQuestion();
    }, 700);

  } else {
    if (choice === "A") aBtn.style.background = "#dc2626";
    if (choice === "B") bBtn.style.background = "#dc2626";
    if (choice === "C") cBtn.style.background = "#dc2626";

    const correctButtonIndex = currentShuffledAnswers.findIndex(
      item => item.key === correct
    );

    if (correctButtonIndex === 0) aBtn.style.background = "#16a34a";
    if (correctButtonIndex === 1) bBtn.style.background = "#16a34a";
    if (correctButtonIndex === 2) cBtn.style.background = "#16a34a";

    setTimeout(() => {
      finishQuiz();
    }, 900);
  }
}

async function finishQuiz() {
  clearInterval(timer);

  let rewardMessage = "";

  try {
    let user = null;

    try {
      const {
        data: { user: sessionUser }
      } = await quizClient.auth.getUser();
      user = sessionUser;
    } catch (err) {
      console.error("Get user error:", err);
    }

    if (user) {
      await quizClient.rpc("record_quiz_result", {
        p_user: user.id,
        p_score: score
      });

      if (score === 10) {
        const { data: todayHelpCount } =
          await quizClient.rpc("get_today_quiz_help", { p_user: user.id });

        if (todayHelpCount >= 1) {
          rewardMessage =
            "🎁 Αν έκανες 10/10 και δεν είχες ήδη κερδίσει σήμερα, πήρες 1 Help!";
        }
      }
    } else {
      rewardMessage = "Δοκιμαστική λειτουργία χωρίς login.";
    }
  } catch (err) {
    console.error(err);
  }

  if (score === 10 && rewardMessage === "") {
    rewardMessage = "🎉 Συγχαρητήρια! Πήρες 1 Help.";
  } else if (score === 10 && rewardMessage === "Δοκιμαστική λειτουργία χωρίς login.") {
    rewardMessage = "🎉 Συγχαρητήρια! 10/10 σε δοκιμαστική λειτουργία.";
  } else if (score < 10 && rewardMessage === "") {
    rewardMessage =
      "Δοκίμασε ξανά για να πετύχεις 10/10 και να κερδίσεις 1 Help.";
  }

document.body.innerHTML = `
  <div style="font-family:Arial,sans-serif;background:#0f172a;color:white;text-align:center;padding:40px;min-height:100vh;">
    <h1>Το Quiz Τελείωσε</h1>

    <p style="font-size:22px;">Σκορ: ${score}/${questions.length}</p>

    <p style="font-size:18px; margin:20px 0;">${rewardMessage}</p>

    <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:20px;">

      <button onclick="location.reload()"
      style="padding:12px 20px;font-size:16px;border:none;border-radius:8px;background:#1d9bf0;color:white;cursor:pointer;">
      🔁 Παίξε Ξανά
      </button>

      <button onclick="window.location.href='dashboard.html'"
      style="padding:12px 20px;font-size:16px;border:none;border-radius:8px;background:#16a34a;color:white;cursor:pointer;">
      ⬅ Επιστροφή στο Dashboard
      </button>

    </div>
  </div>
`;

  if (score === 10 && typeof confetti === "function") {
    confetti({
      particleCount: 180,
      spread: 90,
      origin: { y: 0.6 }
    });
  }
}
