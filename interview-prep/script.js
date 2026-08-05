var homeScreen = document.getElementById("homeScreen");
var quizScreen = document.getElementById("quizScreen");
var resultScreen = document.getElementById("resultScreen");
var darkToggle = document.getElementById("darkToggle");

var currentQuiz = [];
var currentIndex = 0;
var answers = [];
var timerInterval = null;
var timeLeft = 120;
var isDark = localStorage.getItem("darkMode") === "true";

if (isDark) {
  document.body.classList.add("dark");
  darkToggle.textContent = "\u2600\uFE0F";
}

function countByCategory(cat) {
  if (cat === "all") return questions.length;
  return questions.filter(function (q) { return q.category === cat; }).length;
}

function updateCounts() {
  document.getElementById("countCoding").textContent = countByCategory("Coding") + " soal";
  document.getElementById("countSystem").textContent = countByCategory("System Design") + " soal";
  document.getElementById("countBehavioral").textContent = countByCategory("Behavioral") + " soal";
  document.getElementById("countAll").textContent = countByCategory("all") + " soal";
}

function shuffle(arr) {
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = a[i]; a[i] = a[j]; a[j] = temp;
  }
  return a;
}

function startQuiz(category) {
  var pool;
  if (category === "all") {
    pool = shuffle(questions);
  } else {
    pool = shuffle(questions.filter(function (q) { return q.category === category; }));
  }

  currentQuiz = pool.slice(0, Math.min(10, pool.length));
  currentIndex = 0;
  answers = new Array(currentQuiz.length).fill(-1);
  timeLeft = 120;

  homeScreen.classList.add("hidden");
  resultScreen.classList.add("hidden");
  quizScreen.classList.remove("hidden");

  document.getElementById("quizCategory").textContent = category === "all" ? "Semua" : category;
  startTimer();
  renderQuestion();
}

function startTimer() {
  clearInterval(timerInterval);
  updateTimerDisplay();
  timerInterval = setInterval(function () {
    timeLeft--;
    updateTimerDisplay();
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      finishQuiz();
    }
  }, 1000);
}

function updateTimerDisplay() {
  var min = Math.floor(timeLeft / 60);
  var sec = timeLeft % 60;
  var display = (min < 10 ? "0" : "") + min + ":" + (sec < 10 ? "0" : "") + sec;
  var el = document.getElementById("quizTimer");
  el.textContent = display;
  el.classList.remove("warning", "danger");
  if (timeLeft <= 30) el.classList.add("danger");
  else if (timeLeft <= 60) el.classList.add("warning");
}

function renderQuestion() {
  var q = currentQuiz[currentIndex];
  document.getElementById("quizProgress").textContent = "Soal " + (currentIndex + 1) + "/" + currentQuiz.length;
  document.getElementById("questionText").textContent = q.question;

  var letters = ["A", "B", "C", "D"];
  var html = "";
  q.options.forEach(function (opt, i) {
    var sel = answers[currentIndex] === i ? " selected" : "";
    html += '<button class="option-btn' + sel + '" onclick="selectAnswer(' + i + ')">';
    html += '<span class="option-letter">' + letters[i] + '</span>';
    html += '<span>' + opt + '</span>';
    html += '</button>';
  });
  document.getElementById("optionsList").innerHTML = html;

  document.getElementById("prevBtn").disabled = currentIndex === 0;

  if (currentIndex === currentQuiz.length - 1) {
    document.getElementById("nextBtn").classList.add("hidden");
    document.getElementById("finishBtn").classList.remove("hidden");
  } else {
    document.getElementById("nextBtn").classList.remove("hidden");
    document.getElementById("finishBtn").classList.add("hidden");
  }
}

function selectAnswer(idx) {
  answers[currentIndex] = idx;
  renderQuestion();
}

function nextQuestion() {
  if (currentIndex < currentQuiz.length - 1) {
    currentIndex++;
    renderQuestion();
  }
}

function prevQuestion() {
  if (currentIndex > 0) {
    currentIndex--;
    renderQuestion();
  }
}

function finishQuiz() {
  clearInterval(timerInterval);

  var correct = 0;
  currentQuiz.forEach(function (q, i) {
    if (answers[i] === q.correct) correct++;
  });

  var total = currentQuiz.length;
  var percent = Math.round((correct / total) * 100);

  var cat = document.getElementById("quizCategory").textContent;
  var now = new Date();
  var dateStr = now.toLocaleDateString("id-ID") + " " + now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

  var history = JSON.parse(localStorage.getItem("quizHistory") || "[]");
  history.unshift({ category: cat, score: correct, total: total, percent: percent, date: dateStr });
  if (history.length > 20) history = history.slice(0, 20);
  localStorage.setItem("quizHistory", JSON.stringify(history));

  document.getElementById("scoreNumber").textContent = correct;
  document.getElementById("totalQuestions").textContent = total;
  document.getElementById("resultPercent").textContent = percent + "%";

  var msg;
  if (percent >= 80) msg = "Excellent! Kamu sudah siap interview \uD83C\uDF89";
  else if (percent >= 60) msg = "Good! Masih ada yang perlu diperbaiki \uD83D\uDCAA";
  else msg = "Perlu belajar lagi. Jangan menyerah! \uD83D\uDCDA";
  document.getElementById("resultMessage").textContent = msg;

  var letters = ["A", "B", "C", "D"];
  var reviewHtml = "";
  currentQuiz.forEach(function (q, i) {
    var isCorrect = answers[i] === q.correct;
    var cls = isCorrect ? "review-correct" : "review-wrong";
    var icon = isCorrect ? "\u2705" : "\u274C";

    reviewHtml += '<div class="review-item ' + cls + '">';
    reviewHtml += '<p class="review-q">' + icon + ' ' + q.question + '</p>';
    reviewHtml += '<p class="review-answer">Jawaban kamu: ' + (answers[i] >= 0 ? letters[answers[i]] + ". " + q.options[answers[i]] : "Tidak dijawab") + '</p>';
    if (!isCorrect) {
      reviewHtml += '<p class="review-answer" style="color:#22c55e;">Jawaban benar: ' + letters[q.correct] + ". " + q.options[q.correct] + '</p>';
    }
    reviewHtml += '<p class="review-explain">' + q.explanation + '</p>';
    reviewHtml += '</div>';
  });
  document.getElementById("reviewList").innerHTML = reviewHtml;

  quizScreen.classList.add("hidden");
  resultScreen.classList.remove("hidden");
  resultScreen.scrollIntoView({ behavior: "smooth" });
}

function goHome() {
  resultScreen.classList.add("hidden");
  homeScreen.classList.remove("hidden");
  updateCounts();
  renderHistory();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function retryQuiz() {
  var cat = document.getElementById("quizCategory").textContent;
  var mapCat = { "Coding": "Coding", "System Design": "System Design", "Behavioral": "Behavioral", "Semua": "all" };
  startQuiz(mapCat[cat] || "all");
}

function renderHistory() {
  var history = JSON.parse(localStorage.getItem("quizHistory") || "[]");
  var el = document.getElementById("historyList");

  if (history.length === 0) {
    el.innerHTML = '<p class="empty-history">Belum ada riwayat.</p>';
    return;
  }

  var html = "";
  history.forEach(function (h) {
    var scoreClass = h.percent >= 80 ? "score-high" : h.percent >= 60 ? "score-mid" : "score-low";
    html += '<div class="history-item">';
    html += '<span>' + h.category + ' &mdash; ' + h.date + '</span>';
    html += '<span class="history-score ' + scoreClass + '">' + h.score + '/' + h.total + ' (' + h.percent + '%)</span>';
    html += '</div>';
  });
  el.innerHTML = html;
}

function clearHistory() {
  localStorage.removeItem("quizHistory");
  renderHistory();
}

darkToggle.addEventListener("click", function () {
  isDark = !isDark;
  document.body.classList.toggle("dark");
  darkToggle.textContent = isDark ? "\u2600\uFE0F" : "\uD83C\uDF19";
  localStorage.setItem("darkMode", isDark);
});

updateCounts();
renderHistory();