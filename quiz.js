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
let currentContestCode = "active";

aBtn.onclick = () => answer("A");
bBtn.onclick = () => answer("B");
cBtn.onclick = () => answer("C");

startQuiz();

async function startQuiz() {
  try {
    const {
      data: { user }
    } = await quizClient.auth.getUser();

    if (!user) {
      showMessage("Πρέπει να είσαι συνδεδεμένος για να παίξεις.");
      return;
    }

    await loadActiveContestCode();

    const { data: todayCount, error: attemptsError } =
      await quizClient.rpc("get_today_quiz_attempts", {
        p_user: user.id
      });

    if (attemptsError) {
      console.error("Attempts error:", attemptsError);
      showMessage("Σφάλμα ελέγχου quiz.");
      return;
    }

    if ((todayCount || 0) >= 2) {
      document.body.innerHTML = `
      <div style="
        font-family:Arial,sans-serif;
        background:#0f172a;
        color:white;
        text-align:center;
        padding:40px;
        min-height:100vh;
      ">
        <h2>Έπαιξες ήδη 2 φορές σήμερα</h2>
        <p style="font-size:18px;margin-top:10px;">
          Έλα ξανά αύριο για να παίξεις πάλι.
        </p>
        <button
          onclick="window.location.href='dashboard.html'"
          style="
            margin-top:25px;
            padding:12px 22px;
            font-size:16px;
            border:none;
            border-radius:8px;
            background:#16a34a;
            color:white;
            cursor:pointer;
          ">
          ⬅ Επιστροφή στο Dashboard
        </button>
      </div>
      `;
      return;
    }

  const { data, error } = await quizClient.rpc(
  "get_random_quiz_questions_for_user",
  { p_user_id: user.id }
);


    if (error) {
      console.error("Quiz load error:", error);
      showMessage("Σφάλμα φόρτωσης ερωτήσεων.");
      return;
    }

    if (!data || data.length === 0) {
      showMessage("Δεν βρέθηκαν ερωτήσεις.");
      return;
    }

    questions = shuffleArray(data).slice(0, 10);
    currentQuestion = 0;
    score = 0;

    await saveQuestionHistory(user.id, questions);

    loadQuestion();
  } catch (err) {
    console.error("Quiz start error:", err);
    showMessage("Σφάλμα φόρτωσης quiz.");
  }
}

async function loadActiveContestCode() {
  try {
    const { data, error } = await quizClient
      .from("contests")
      .select("code,status,active")
      .eq("active", true)
      .limit(1)
      .maybeSingle();

    if (!error && data?.code) {
      currentContestCode = data.code;
    }
  } catch (err) {
    console.error("Active contest load error:", err);
  }
}

async function saveQuestionHistory(userId, loadedQuestions) {
  try {
    if (!Array.isArray(loadedQuestions) || loadedQuestions.length === 0) return;

    const rows = loadedQuestions
      .filter(q => q && q.id !== undefined && q.id !== null)
      .map(q => ({
        user_id: userId,
        question_id: q.id
      }));

    if (!rows.length) return;

    const { error } = await quizClient
      .from("quiz_question_history")
      .insert(rows);

    if (error) {
      console.error("Question history insert error:", error);
    }
  } catch (err) {
    console.error("saveQuestionHistory error:", err);
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

function formatRewardError(recordError) {
  if (!recordError) return "Άγνωστο σφάλμα.";

  if (typeof recordError === "string") return recordError;

  const parts = [];

  if (recordError.message) parts.push(recordError.message);
  if (recordError.details) parts.push(recordError.details);
  if (recordError.hint) parts.push(recordError.hint);
  if (recordError.code) parts.push(`code: ${recordError.code}`);

  if (parts.length > 0) return parts.join(" | ");

  try {
    return JSON.stringify(recordError);
  } catch {
    return "Άγνωστο σφάλμα reward.";
  }
}

async function finishQuiz() {
  clearInterval(timer);

  let rewardMessage = "";

  try {
    const {
      data: { user }
    } = await quizClient.auth.getUser();

    if (user) {
      const { error: recordError } = await quizClient.rpc("record_quiz_result", {
        p_user: user.id,
        p_score: score,
        p_contest_code: currentContestCode
      });

      if (recordError) {
        console.error("Record quiz result error:", recordError);
        rewardMessage = `Reward error: ${formatRewardError(recordError)}`;
      } else {
        if (score === 10) {
          rewardMessage = "🎉 Συγχαρητήρια! Κέρδισες 1 Help.";
        } else {
          rewardMessage = "Δοκίμασε ξανά για να πετύχεις 10/10.";
        }
      }
    } else {
      rewardMessage = "Πρέπει να είσαι συνδεδεμένος για να καταγράφεται το αποτέλεσμα.";
    }
  } catch (err) {
    console.error("Finish quiz error:", err);
    rewardMessage = `Finish error: ${err?.message || "Άγνωστο σφάλμα."}`;
  }

  document.body.innerHTML = `
  <div style="
    font-family:Arial,sans-serif;
    background:#0f172a;
    color:white;
    text-align:center;
    padding:40px;
    min-height:100vh;
  ">
    <h1>Το Quiz Τελείωσε</h1>

    <p style="font-size:22px;">
      Σκορ: ${score}/${questions.length}
    </p>

    <p style="font-size:18px;margin:20px 0; max-width:900px; margin-left:auto; margin-right:auto; line-height:1.5;">
      ${rewardMessage}
    </p>

    <div style="
      display:flex;
      justify-content:center;
      gap:12px;
      flex-wrap:wrap;
    ">
      <button
        onclick="location.reload()"
        style="
          padding:12px 20px;
          font-size:16px;
          border:none;
          border-radius:8px;
          background:#1d9bf0;
          color:white;
          cursor:pointer;
        ">
        🔁 Παίξε Ξανά
      </button>

      <button
        onclick="window.location.href='dashboard.html'"
        style="
          padding:12px 20px;
          font-size:16px;
          border:none;
          border-radius:8px;
          background:#16a34a;
          color:white;
          cursor:pointer;
        ">
        ⬅ Dashboard
      </button>
    </div>
  </div>
  `;
}

function showMessage(text) {
  document.body.innerHTML = `
  <div style="
    font-family:Arial,sans-serif;
    background:#0f172a;
    color:white;
    text-align:center;
    padding:40px;
    min-height:100vh;
  ">
    <h2>${text}</h2>

    <button
      onclick="window.location.href='dashboard.html'"
      style="
        margin-top:25px;
        padding:12px 22px;
        font-size:16px;
        border:none;
        border-radius:8px;
        background:#16a34a;
        color:white;
        cursor:pointer;
      ">
      ⬅ Επιστροφή στο Dashboard
    </button>
  </div>
  `;
}
