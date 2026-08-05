var toolListEl = document.getElementById("toolList");
var searchInput = document.getElementById("searchInput");
var categoryFilter = document.getElementById("categoryFilter");
var sortFilter = document.getElementById("sortFilter");
var priceFilter = document.getElementById("priceFilter");
var easyOnlyCheckbox = document.getElementById("easyOnly");
var favOnlyCheckbox = document.getElementById("favOnly");
var darkToggle = document.getElementById("darkToggle");
var backToTop = document.getElementById("backToTop");
var resultCount = document.getElementById("resultCount");
var totalToolsEl = document.getElementById("totalTools");
var importBtn = document.getElementById("importBtn");
var importModal = document.getElementById("importModal");
var importForm = document.getElementById("importForm");
var modal = document.getElementById("modal");
var modalBody = document.getElementById("modalBody");
var compareBar = document.getElementById("compareBar");
var compareCount = document.getElementById("compareCount");
var compareBtn = document.getElementById("compareBtn");
var compareClear = document.getElementById("compareClear");
var compareModal = document.getElementById("compareModal");
var compareBody = document.getElementById("compareBody");

var favorites = JSON.parse(localStorage.getItem("favorites") || "[]");
var userTools = JSON.parse(localStorage.getItem("userTools") || "[]");
var isDark = localStorage.getItem("darkMode") === "true";
var compareList = [];

var allTools = tools.concat(userTools);

if (isDark) {
  document.body.classList.add("dark");
  darkToggle.textContent = "\u2600\uFE0F";
}

function getPriceType(tool) {
  var p = tool.price.toLowerCase();
  if (p.indexOf("local") !== -1) return "local";
  if (p.indexOf("self-hosted") !== -1 || p.indexOf("self hosted") !== -1) return "self-hosted";
  return "gratis";
}

function renderStats(filtered) {
  var total = filtered.length;
  var gratis = 0, selfhosted = 0, local = 0;
  filtered.forEach(function (t) {
    var pt = getPriceType(t);
    if (pt === "local") local++;
    else if (pt === "self-hosted") selfhosted++;
    else gratis++;
  });

  document.querySelector("#statTotal .stat-number").textContent = total;
  document.querySelector("#statGratis .stat-number").textContent = gratis;
  document.querySelector("#statSelfhosted .stat-number").textContent = selfhosted;
  document.querySelector("#statLocal .stat-number").textContent = local;

  if (total > 0) {
    document.getElementById("barGratis").style.width = (gratis / total * 100) + "%";
    document.getElementById("barSelfhosted").style.width = (selfhosted / total * 100) + "%";
    document.getElementById("barLocal").style.width = (local / total * 100) + "%";
  } else {
    document.getElementById("barGratis").style.width = "0%";
    document.getElementById("barSelfhosted").style.width = "0%";
    document.getElementById("barLocal").style.width = "0%";
  }
}

function renderTools() {
  var keyword = searchInput.value.toLowerCase();
  var category = categoryFilter.value;
  var sortBy = sortFilter.value;
  var priceType = priceFilter.value;
  var easyOnly = easyOnlyCheckbox.checked;
  var favOnly = favOnlyCheckbox.checked;

  var filtered = allTools.filter(function (tool) {
    var matchText =
      tool.tool.toLowerCase().includes(keyword) ||
      tool.replaces.toLowerCase().includes(keyword) ||
      tool.category.toLowerCase().includes(keyword) ||
      tool.description.toLowerCase().includes(keyword);

    var matchCategory = category === "" || tool.category === category;
    var matchLevel = !easyOnly || tool.level === "Mudah";
    var matchFav = !favOnly || favorites.indexOf(tool.id) !== -1;
    var matchPrice = priceType === "" || getPriceType(tool) === priceType;

    return matchText && matchCategory && matchLevel && matchFav && matchPrice;
  });

  if (sortBy === "name-asc") {
    filtered.sort(function (a, b) { return a.tool.localeCompare(b.tool); });
  } else if (sortBy === "name-desc") {
    filtered.sort(function (a, b) { return b.tool.localeCompare(a.tool); });
  } else if (sortBy === "category") {
    filtered.sort(function (a, b) { return a.category.localeCompare(b.category); });
  } else if (sortBy === "level") {
    var levelOrder = { "Mudah": 1, "Menengah": 2, "Sulit": 3 };
    filtered.sort(function (a, b) { return levelOrder[a.level] - levelOrder[b.level]; });
  }

  resultCount.textContent = "Ditemukan " + filtered.length + " tool dari " + allTools.length;
  totalToolsEl.textContent = allTools.length;

  renderStats(filtered);

  if (filtered.length === 0) {
    toolListEl.innerHTML = '<p class="empty">Tidak ada tool yang cocok.</p>';
    return;
  }

  toolListEl.innerHTML = filtered
    .map(function (tool) {
      var isFav = favorites.indexOf(tool.id) !== -1;
      var starClass = isFav ? "fav-btn active" : "fav-btn";
      var starIcon = isFav ? "\u2B50" : "\u2606";
      var isCompare = compareList.indexOf(tool.id) !== -1;
      var selectedClass = isCompare ? " tool-card selected" : "";

      return (
        '<div class="tool-card' + selectedClass + '" data-id="' + tool.id + '">' +
        '<button class="' + starClass + '" onclick="event.stopPropagation();toggleFav(' + tool.id + ')" title="Favorit">' + starIcon + '</button>' +
        "<h3>" + tool.tool + "</h3>" +
        '<p class="replaces">Gantikan: ' + tool.replaces + "</p>" +
        '<p class="description">' + tool.description + "</p>" +
        '<div class="meta">' +
        '<span class="tag">' + tool.category + "</span>" +
        '<span class="tag price">' + tool.price + "</span>" +
        '<span class="tag level">' + tool.level + "</span>" +
        "</div>" +
        '<div class="card-actions">' +
        '<a href="' + tool.link + '" target="_blank" onclick="event.stopPropagation()">Lihat</a>' +
        '<button class="share-btn" onclick="event.stopPropagation();shareTool(' + tool.id + ')" title="Share">Share</button>' +
        '<button class="compare-check" onclick="event.stopPropagation();toggleCompare(' + tool.id + ')" title="Bandingkan">' + (isCompare ? "\u2611" : "\u2610") + '</button>' +
        "</div>" +
        "</div>"
      );
    })
    .join("");

  document.querySelectorAll(".tool-card").forEach(function (card) {
    card.addEventListener("click", function () {
      var id = parseInt(this.getAttribute("data-id"));
      openDetail(id);
    });
  });
}

function toggleFav(id) {
  var index = favorites.indexOf(id);
  if (index === -1) {
    favorites.push(id);
    showToast("Ditambahkan ke favorit \u2B50");
  } else {
    favorites.splice(index, 1);
    showToast("Dihapus dari favorit");
  }
  localStorage.setItem("favorites", JSON.stringify(favorites));
  renderTools();
}

function shareTool(id) {
  var tool = allTools.find(function (t) { return t.id === id; });
  if (!tool) return;
  var text = tool.tool + " - Alternatif gratis untuk " + tool.replaces + "\n" + tool.link;

  if (navigator.share) {
    navigator.share({ title: tool.tool, text: text, url: tool.link });
  } else {
    navigator.clipboard.writeText(text).then(function () {
      showToast("Link disalin ke clipboard \uD83D\uDCCB");
    });
  }
}

function toggleCompare(id) {
  var index = compareList.indexOf(id);
  if (index === -1) {
    if (compareList.length >= 2) {
      showToast("Maksimal 2 tool untuk dibandingkan");
      return;
    }
    compareList.push(id);
  } else {
    compareList.splice(index, 1);
  }

  if (compareList.length > 0) {
    compareBar.classList.remove("hidden");
    compareCount.textContent = compareList.length;
  } else {
    compareBar.classList.add("hidden");
  }

  renderTools();
}

function openCompare() {
  if (compareList.length < 2) return;
  var a = allTools.find(function (t) { return t.id === compareList[0]; });
  var b = allTools.find(function (t) { return t.id === compareList[1]; });
  if (!a || !b) return;

  var rows = [
    ["Tool", a.tool, b.tool],
    ["Gantikan", a.replaces, b.replaces],
    ["Kategori", a.category, b.category],
    ["Harga", a.price, b.price],
    ["Level", a.level, b.level],
    ["Link", '<a href="' + a.link + '" target="_blank">Buka</a>', '<a href="' + b.link + '" target="_blank">Buka</a>']
  ];

  var html = '<table class="compare-table">';
  rows.forEach(function (row) {
    html += "<tr><th>" + row[0] + "</th><td>" + row[1] + "</td><td>" + row[2] + "</td></tr>";
  });
  html += "</table>";

  compareBody.innerHTML = html;
  compareModal.classList.remove("hidden");
}

function openDetail(id) {
  var tool = allTools.find(function (t) { return t.id === id; });
  if (!tool) return;

  var pt = getPriceType(tool);
  var ptLabel = pt === "local" ? "Local/Offline" : pt === "self-hosted" ? "Self-hosted" : "Gratis Total";

  var html =
    '<h2>' + tool.tool + '</h2>' +
    '<p style="color:#dc2626;font-weight:600;margin-bottom:0.5rem;">Gantikan: ' + tool.replaces + '</p>' +
    '<p style="margin-bottom:1rem;">' + tool.description + '</p>' +
    '<div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-bottom:1rem;">' +
    '<span class="tag">' + tool.category + '</span>' +
    '<span class="tag price">' + tool.price + '</span>' +
    '<span class="tag level">' + tool.level + '</span>' +
    '<span class="tag">' + ptLabel + '</span>' +
    '</div>' +
    '<a href="' + tool.link + '" target="_blank" style="display:inline-block;color:white;background:#2563eb;padding:0.6rem 1.2rem;border-radius:8px;text-decoration:none;">Lihat di GitHub</a>';

  modalBody.innerHTML = html;
  modal.classList.remove("hidden");
}

function showToast(msg) {
  var existing = document.querySelector(".toast");
  if (existing) existing.remove();

  var toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = msg;
  document.body.appendChild(toast);

  setTimeout(function () { toast.remove(); }, 2500);
}

function handleImport(e) {
  e.preventDefault();

  var maxId = 0;
  allTools.forEach(function (t) { if (t.id > maxId) maxId = t.id; });

  var newTool = {
    id: maxId + 1,
    tool: document.getElementById("impTool").value,
    replaces: document.getElementById("impReplaces").value,
    category: document.getElementById("impCategory").value,
    price: document.getElementById("impPrice").value,
    link: document.getElementById("impLink").value,
    description: document.getElementById("impDesc").value,
    level: document.getElementById("impLevel").value,
    priceType: document.getElementById("impPriceType").value
  };

  userTools.push(newTool);
  localStorage.setItem("userTools", JSON.stringify(userTools));
  allTools = tools.concat(userTools);

  importModal.classList.add("hidden");
  importForm.reset();
  renderTools();
  showToast("Tool berhasil ditambahkan! \u2705");
}

darkToggle.addEventListener("click", function () {
  isDark = !isDark;
  document.body.classList.toggle("dark");
  darkToggle.textContent = isDark ? "\u2600\uFE0F" : "\uD83C\uDF19";
  localStorage.setItem("darkMode", isDark);
});

window.addEventListener("scroll", function () {
  if (window.scrollY > 400) {
    backToTop.classList.add("show");
  } else {
    backToTop.classList.remove("show");
  }
});

backToTop.addEventListener("click", function () {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

importBtn.addEventListener("click", function () {
  importModal.classList.remove("hidden");
});

document.getElementById("importModalClose").addEventListener("click", function () {
  importModal.classList.add("hidden");
});

modal.addEventListener("click", function (e) {
  if (e.target === modal) modal.classList.add("hidden");
});

compareModal.addEventListener("click", function (e) {
  if (e.target === compareModal) compareModal.classList.add("hidden");
});

importModal.addEventListener("click", function (e) {
  if (e.target === importModal) importModal.classList.add("hidden");
});

document.getElementById("modalClose").addEventListener("click", function () {
  modal.classList.add("hidden");
});

document.getElementById("compareModalClose").addEventListener("click", function () {
  compareModal.classList.add("hidden");
});

compareBtn.addEventListener("click", openCompare);

compareClear.addEventListener("click", function () {
  compareList = [];
  compareBar.classList.add("hidden");
  renderTools();
});

searchInput.addEventListener("input", renderTools);
categoryFilter.addEventListener("change", renderTools);
sortFilter.addEventListener("change", renderTools);
priceFilter.addEventListener("change", renderTools);
easyOnlyCheckbox.addEventListener("change", renderTools);
favOnlyCheckbox.addEventListener("change", renderTools);
importForm.addEventListener("submit", handleImport);

document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") {
    searchInput.value = "";
    modal.classList.add("hidden");
    compareModal.classList.add("hidden");
    importModal.classList.add("hidden");
    renderTools();
    searchInput.blur();
  }
});

renderTools();