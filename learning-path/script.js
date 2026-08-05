var homeScreen = document.getElementById("homeScreen");
var roadmapScreen = document.getElementById("roadmapScreen");
var stepScreen = document.getElementById("stepScreen");
var darkToggle = document.getElementById("darkToggle");

var currentRole = null;
var currentStepIndex = 0;
var progress = JSON.parse(localStorage.getItem("learningProgress") || "{}");
var isDark = localStorage.getItem("darkMode") === "true";

if (isDark) {
  document.body.classList.add("dark");
  darkToggle.textContent = "\u2600\uFE0F";
}

function renderHome() {
  var grid = document.getElementById("roleGrid");
  var html = "";

  Object.keys(roadmaps).forEach(function (role) {
    var r = roadmaps[role];
    var done = getCompletedCount(role);
    var total = r.steps.length;

    html += '<div class="role-card" onclick="openRoadmap(\'' + role + '\')">';
    html += '<div class="role-icon">' + r.icon + '</div>';
    html += '<h3>' + role + '</h3>';
    html += '<p>' + r.description + '</p>';
    if (done > 0) {
      html += '<p style="margin-top:0.5rem;color:#059669;font-weight:600;">' + done + '/' + total + ' selesai</p>';
    }
    html += '</div>';
  });

  grid.innerHTML = html;
  renderProgressSummary();
}

function getCompletedCount(role) {
  if (!progress[role]) return 0;
  return progress[role].filter(function (v) { return v; }).length;
}

function renderProgressSummary() {
  var container = document.getElementById("progressCards");
  var hasProgress = false;
  var html = "";

  Object.keys(roadmaps).forEach(function (role) {
    var done = getCompletedCount(role);
    if (done > 0) {
      hasProgress = true;
      var total = roadmaps[role].steps.length;
      var percent = Math.round((done / total) * 100);

      html += '<div class="progress-item">';
      html += '<div class="progress-item-left">';
      html += '<span>' + roadmaps[role].icon + '</span>';
      html += '<span class="progress-item-name">' + role + '</span>';
      html += '</div>';
      html += '<div class="progress-item-bar"><div class="progress-item-fill" style="width:' + percent + '%"></div></div>';
      html += '<span class="progress-item-percent">' + percent + '%</span>';
      html += '</div>';
    }
  });

  if (!hasProgress) {
    html = '<p class="no-progress">Belum ada progress. Mulai belajar sekarang!</p>';
  }

  container.innerHTML = html;
}

function openRoadmap(role) {
  currentRole = role;
  currentStepIndex = 0;

  homeScreen.classList.add("hidden");
  stepScreen.classList.add("hidden");
  roadmapScreen.classList.remove("hidden");

  var r = roadmaps[role];
  document.getElementById("roadmapIcon").textContent = r.icon;
  document.getElementById("roadmapName").textContent = role;
  document.getElementById("roadmapDesc").textContent = r.description;

  renderRoadmap();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderRoadmap() {
  var r = roadmaps[currentRole];
  var completed = progress[currentRole] || new Array(r.steps.length).fill(false);
  var doneCount = completed.filter(function (v) { return v; }).length;
  var total = r.steps.length;
  var percent = Math.round((doneCount / total) * 100);

  document.getElementById("progressFill").style.width = percent + "%";
  document.getElementById("progressText").textContent = doneCount + "/" + total + " selesai";

  var html = "";
  r.steps.forEach(function (step, i) {
    var isDone = completed[i];
    var cls = isDone ? "step-item done" : "step-item";
    var check = isDone ? "\u2713" : (i + 1);

    html += '<div class="' + cls + '" onclick="openStep(' + i + ')">';
    html += '<div class="step-item-check">' + check + '</div>';
    html += '<div class="step-item-info">';
    html += '<div class="step-item-title">' + step.title + '</div>';
    html += '<div class="step-item-meta">';
    html += '<span class="tag">' + step.difficulty + '</span>';
    html += '<span class="tag tag-duration">' + step.duration + '</span>';
    html += '</div>';
    html += '</div>';
    html += '</div>';
  });

  document.getElementById("stepsList").innerHTML = html;
}

function openStep(index) {
  currentStepIndex = index;
  roadmapScreen.classList.add("hidden");
  stepScreen.classList.remove("hidden");

  renderStep();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderStep() {
  var r = roadmaps[currentRole];
  var step = r.steps[currentStepIndex];
  var completed = progress[currentRole] || new Array(r.steps.length).fill(false);
  var isDone = completed[currentStepIndex];

  document.getElementById("stepTitle").textContent = step.title;
  document.getElementById("stepDifficulty").textContent = step.difficulty;
  document.getElementById("stepDuration").textContent = step.duration;
  document.getElementById("stepDescription").textContent = step.description;

  var checkEl = document.getElementById("stepCheck");
  checkEl.textContent = isDone ? "\u2713" : "";
  checkEl.className = isDone ? "step-check done" : "step-check";

  var resourcesHtml = "";
  step.resources.forEach(function (res) {
    resourcesHtml += '<div class="resource-item">';
    resourcesHtml += '<a href="' + res.url + '" target="_blank" class="resource-name" style="color:#059669;text-decoration:none;">' + res.name + '</a>';
    resourcesHtml += '<span class="resource-type">' + res.type + '</span>';
    resourcesHtml += '</div>';
  });
  document.getElementById("resourceList").innerHTML = resourcesHtml;

  document.getElementById("cheatsheetBox").textContent = step.cheatsheet;

  document.getElementById("prevStepBtn").disabled = currentStepIndex === 0;
  document.getElementById("nextStepBtn").textContent = currentStepIndex === r.steps.length - 1 ? "Selesai \u2713" : "Selanjutnya \u2192";
}

function toggleStepComplete() {
  if (!progress[currentRole]) {
    progress[currentRole] = new Array(roadmaps[currentRole].steps.length).fill(false);
  }
  progress[currentRole][currentStepIndex] = !progress[currentRole][currentStepIndex];
  localStorage.setItem("learningProgress", JSON.stringify(progress));
  renderStep();
  renderRoadmap();
}

function nextStep() {
  var r = roadmaps[currentRole];
  if (currentStepIndex < r.steps.length - 1) {
    currentStepIndex++;
    renderStep();
    window.scrollTo({ top: 0, behavior: "smooth" });
  } else {
    goBackToRoadmap();
  }
}

function prevStep() {
  if (currentStepIndex > 0) {
    currentStepIndex--;
    renderStep();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function goBackToRoadmap() {
  stepScreen.classList.add("hidden");
  roadmapScreen.classList.remove("hidden");
  renderRoadmap();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function goHome() {
  roadmapScreen.classList.add("hidden");
  stepScreen.classList.add("hidden");
  homeScreen.classList.remove("hidden");
  renderHome();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

darkToggle.addEventListener("click", function () {
  isDark = !isDark;
  document.body.classList.toggle("dark");
  darkToggle.textContent = isDark ? "\u2600\uFE0F" : "\uD83C\uDF19";
  localStorage.setItem("darkMode", isDark);
});

renderHome();