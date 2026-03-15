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

aBtn.onclick = () => answer("A");
bBtn.onclick = () => answer("B");
cBtn.onclick = () => answer("C");

startQuiz();

async function startQuiz() {

  try {

    const { data: { user } } = await quizClient.auth.getUser();

    if (!user) {
      showMessage("Πρέπει να είσαι συνδεδεμένος για να παίξεις.");
      return;
    }

    const { data: todayCount } = await quizClient.rpc("get_today_quiz_attempts", {
      p_user: user.id
    });

    if (todayCount >= 2) {

      document.body.innerHTML = `
      <div style="
      font-family:Arial;
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

    const { data, error } = await quizClient.rpc("get_random_quiz_questions");

    if (error) {
      showMessage("Σφάλμα φόρτωσης ερωτήσεων");
      return;
    }

    questions = data;
    currentQuestion = 0;
    score = 0;

    loadQuestion();

  } catch (err) {

    showMessage("Σφάλμα φόρτωσης quiz");

  }

}

function loadQuestion() {

  clearInterval(timer);

  if (currentQuestion >= questions.length) {
    finishQuiz();
    return;
  }

  const q = questions[currentQuestion];

  progressElement.innerText =
  `Ερώτηση ${currentQuestion + 1} / ${questions.length}`;

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

    [shuffled[i], shuffled[j]] =
    [shuffled[j], shuffled[i]];

  }

  return shuffled;

}

function answer(choice) {

  const correct =
  questions[currentQuestion].correct_option;

  clearInterval(timer);

  let selectedKey = "";

  if (choice === "A") selectedKey =
  currentShuffledAnswers[0].key;

  if (choice === "B") selectedKey =
  currentShuffledAnswers[1].key;

  if (choice === "C") selectedKey =
  currentShuffledAnswers[2].key;

  if (selectedKey === correct) {

    score++;
    currentQuestion++;
    loadQuestion();

  } else {

    finishQuiz();

  }

}

async function finishQuiz() {

  clearInterval(timer);

  let rewardMessage = "";

  try {

    const { data: { user } } =
    await quizClient.auth.getUser();

    if (user) {

      await quizClient.rpc("record_quiz_result", {
        p_user: user.id,
        p_score: score
      });

      if (score === 10) {

        const { data: todayHelp } =
        await quizClient.rpc("get_today_quiz_help", {
          p_user: user.id
        });

        if (todayHelp < 1) {

          rewardMessage =
          "🎉 Συγχαρητήρια! Κέρδισες 1 Help.";

        }

      }

    }

  } catch (err) {}

  if (score < 10) {

    rewardMessage =
    "Δοκίμασε ξανά για να πετύχεις 10/10.";

  }

  document.body.innerHTML = `
  <div style="
  font-family:Arial;
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

  <p style="font-size:18px;margin:20px 0;">
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
  font-family:Arial;
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
