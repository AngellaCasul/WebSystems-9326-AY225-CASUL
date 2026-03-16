let articlesData = [];

// ── HELPERS ───────────────────────────────────────────────
function diffClass(d) {
  return { Easy: "diff-easy", Basic: "diff-easy", Medium: "diff-medium", Hard: "diff-hard" }[d] || "diff-na";
}

function esc(s) {
  if (!s) return "";
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

function trim(s, n = 300) {
  if (!s || s === "Not Available") return "Not Available";
  return s.length > n ? s.slice(0, n) + "…" : s;
}

function showToast(msg, type = "success") {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = "toast " + type + " show";
  setTimeout(() => t.className = "toast", 3000);
}

// ── STATS ─────────────────────────────────────────────────
function updateStats(articles) {
  document.getElementById("stat-total").textContent  = articles.length;
  document.getElementById("stat-easy").textContent   = articles.filter(a => ["Easy","Basic"].includes(a.difficulty)).length;
  document.getElementById("stat-medium").textContent = articles.filter(a => ["Medium","Hard","Expert"].includes(a.difficulty)).length;
}

// ── RENDER ARTICLES ───────────────────────────────────────
function renderArticles(articles) {
  articlesData = articles;
  updateStats(articles);
  document.getElementById("btn-pdf").disabled = articles.length === 0;
  document.getElementById("articles-label").style.display = articles.length ? "block" : "none";

  const grid = document.getElementById("articles-grid");
  if (!articles.length) {
    grid.innerHTML = `<div id="empty-state"><div class="emoji">📭</div><p>No articles found.</p></div>`;
    return;
  }

  grid.innerHTML = articles.map((a, i) => `
    <div class="article-card" id="card-${i}" onclick="toggleCard(${i})">
      <div class="art-header">
        <div class="art-num">${String(i+1).padStart(2,"0")}</div>
        <div class="art-title">${esc(a.title)}</div>
        <span class="diff-badge ${diffClass(a.difficulty)}">${esc(a.difficulty)}</span>
        <span class="chevron">▼</span>
      </div>
      <div class="art-body" id="body-${i}">

        <div class="art-section">
          <div class="art-section-title">Key Technical Concepts</div>
          <div class="art-text">${esc(trim(a.concepts, 400))}</div>
        </div>

        <div class="art-section">
          <div class="art-section-title">Code Snippets</div>
          ${buildCode(a)}
        </div>

        <div class="art-section">
          <div class="art-section-title">Complexity Analysis</div>
          ${buildComplexity(a)}
        </div>

        <div class="art-section">
          <div class="art-section-title">References / Related Links</div>
          ${buildLinks(a)}
        </div>

        <div style="font-size:0.75rem; color:var(--text-muted); margin-top:8px; font-family:'JetBrains Mono',monospace;">
          🔗 ${esc(a.url)}
        </div>
      </div>
    </div>
  `).join("");
}

function buildCode(a) {
  const snips = (a.code_snippets || []).filter(s => s && s !== "Not Available");
  if (!snips.length) return `<div class="art-text">Not Available</div>`;
  return `<pre class="art-code">${esc(snips[0].slice(0, 500))}</pre>`;
}

function buildComplexity(a) {
  const cx = (a.complexity || []).filter(c => c && c !== "Not Available");
  if (!cx.length) return `<div class="art-text">Not Available</div>`;
  return cx.slice(0, 3).map(c => `<div class="art-text">• ${esc(trim(c, 180))}</div>`).join("");
}

function buildLinks(a) {
  const links = (a.related_links || []).filter(l => l.title && l.title !== "Not Available");
  if (!links.length) return `<div class="art-text">Not Available</div>`;
  return links.slice(0, 4).map(l =>
    `<a class="art-link" href="${esc(l.url)}" target="_blank" onclick="event.stopPropagation()">→ ${esc(trim(l.title, 70))}</a>`
  ).join("");
}

function toggleCard(i) {
  const card = document.getElementById("card-" + i);
  const body = document.getElementById("body-" + i);
  body.classList.toggle("open");
  card.classList.toggle("open");
}

// ── LOAD SAVED DATA ───────────────────────────────────────
async function loadData() {
  try {
    const res  = await fetch("/api/data");
    const data = await res.json();
    if (data.articles && data.articles.length) {
      renderArticles(data.articles);
      showToast(`Loaded ${data.articles.length} articles ✓`);
    } else {
      showToast("No saved data found. Run the scraper first.", "error");
    }
  } catch(e) {
    showToast("Failed to load data.", "error");
  }
}

// ── START SCRAPER ─────────────────────────────────────────
async function startScrape() {
  document.getElementById("btn-scrape").disabled = true;
  document.getElementById("progress-box").style.display = "block";
  document.getElementById("progress-log").innerHTML = "";
  document.getElementById("progress-bar").style.width = "0%";

  const res = await fetch("/api/scrape", { method: "POST" });
  if (!res.ok) {
    showToast("Scraper is already running!", "error");
    document.getElementById("btn-scrape").disabled = false;
    return;
  }

  const es = new EventSource("/api/progress");
  let count = 0;
  const total = 12;

  es.onmessage = async (e) => {
    if (e.data === "ping") return;

    if (e.data === "__DONE__") {
      es.close();
      document.getElementById("progress-bar").style.width = "100%";
      document.getElementById("btn-scrape").disabled = false;
      showToast("Scraping complete! ✓");
      await loadData();
      return;
    }

    if (e.data.startsWith("Scraping article")) count++;
    const pct = Math.min(95, Math.round((count / total) * 100));
    document.getElementById("progress-bar").style.width = pct + "%";

    const log  = document.getElementById("progress-log");
    const line = document.createElement("div");
    line.className = "log-line" + (e.data.startsWith("Done") ? " done" : "");
    line.textContent = "› " + e.data;
    log.appendChild(line);
    log.scrollTop = log.scrollHeight;
  };

  es.onerror = () => {
    es.close();
    document.getElementById("btn-scrape").disabled = false;
    showToast("Connection error.", "error");
  };
}

// ── GENERATE PDF ──────────────────────────────────────────
async function generatePDF() {
  if (!articlesData.length) { showToast("No data to export.", "error"); return; }

  const name = document.getElementById("student-name").value.trim() || "Student";
  const btn  = document.getElementById("btn-pdf");
  btn.disabled = true;
  btn.textContent = "⏳ Generating…";

  try {
    const res = await fetch("/api/generate-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student_name: name })
    });

    if (!res.ok) {
      const err = await res.json();
      showToast(err.error || "PDF error", "error");
      return;
    }

    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "R_Learning_Module.pdf"; a.click();
    URL.revokeObjectURL(url);
    showToast("PDF downloaded! ✓");

  } catch(e) {
    showToast("Failed to generate PDF.", "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "⬇ Download PDF";
  }
}

// ── CLEAR DATA ────────────────────────────────────────────
function clearData() {
  articlesData = [];

  // Reset stats
  document.getElementById("stat-total").textContent  = "—";
  document.getElementById("stat-easy").textContent   = "—";
  document.getElementById("stat-medium").textContent = "—";

  // Reset articles grid back to empty state
  document.getElementById("articles-grid").innerHTML = `
    <div id="empty-state">
      <div class="emoji">📚</div>
      <p>No data yet.<br>Click <strong>Run Scraper</strong> to fetch R articles from GeeksforGeeks,<br>or <strong>Load Saved Data</strong> if you've scraped before.</p>
    </div>
  `;

  // Hide articles label and disable PDF button
  document.getElementById("articles-label").style.display = "none";
  document.getElementById("btn-pdf").disabled = true;

  showToast("Cleared! Data still saved on disk.", "success");
}

// ── AUTO-LOAD ON PAGE OPEN ────────────────────────────────
(async () => {
  const status = await fetch("/api/status").then(r => r.json()).catch(() => ({ has_data: false }));
  if (status.has_data) await loadData();
})();