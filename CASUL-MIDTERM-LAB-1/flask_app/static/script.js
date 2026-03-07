let allGames = [];

function setUrl(url) {
  document.getElementById('url-input').value = url;
}

function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function setProgress(pct, label) {
  document.getElementById('progress-bar').style.width = pct + '%';
  document.getElementById('progress-label').textContent = label;
}

async function startScrape() {
  const url = document.getElementById('url-input').value.trim();
  const count = 25;
  const btn = document.getElementById('scrape-btn');
  const errBox = document.getElementById('error-box');

  if (!url) { showError('Please enter a URL.'); return; }

  // Reset UI
  errBox.style.display = 'none';
  document.getElementById('results-header').style.display = 'none';
  document.getElementById('game-grid').innerHTML = '';
  btn.disabled = true;
  document.getElementById('btn-icon').textContent = '⏳';
  document.getElementById('btn-text').textContent = 'SCRAPING';
  document.getElementById('progress-wrap').style.display = 'block';
  setProgress(10, 'Fetching Polygon page…');

  // Animate progress while waiting
  let prog = 10;
  const progInterval = setInterval(() => {
    prog = Math.min(prog + 3, 85);
    const label = prog < 40 ? 'Finding game links…'
                : prog < 70 ? 'Scraping game pages…'
                : 'Almost done…';
    setProgress(prog, label);
  }, 800);

  try {
    const res = await fetch('/scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, count: parseInt(count) })
    });
    const data = await res.json();
    clearInterval(progInterval);

    if (!res.ok || data.error) {
      showError(data.error || 'Scraping failed. Try a different URL.');
    } else {
      setProgress(100, `Done! ${data.count} games scraped.`);
      setTimeout(() => {
        document.getElementById('progress-wrap').style.display = 'none';
      }, 1500);
      loadGames(data.games);
    }
  } catch (e) {
    clearInterval(progInterval);
    showError('Server error: ' + e.message);
  }

  btn.disabled = false;
  document.getElementById('btn-icon').textContent = '▶';
  document.getElementById('btn-text').textContent = 'SCRAPE';
}

function showError(msg) {
  const box = document.getElementById('error-box');
  box.textContent = '⚠ ' + msg;
  box.style.display = 'block';
  document.getElementById('progress-wrap').style.display = 'none';
}

function loadGames(games) {
  allGames = games;
  populatePlatformFilter(games);
  document.getElementById('results-header').style.display = 'flex';
  document.getElementById('result-count').textContent = games.length;
  renderGames(games);
  document.getElementById('game-grid').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function populatePlatformFilter(games) {
  const platforms = new Set();
  games.forEach(g => {
    if (g.platform && g.platform !== 'Not Available') {
      g.platform.split(/,|\//).forEach(p => {
        const c = p.trim();
        if (c) platforms.add(c);
      });
    }
  });
  const sel = document.getElementById('platform-filter');
  sel.innerHTML = '<option value="">All Platforms</option>';
  [...platforms].sort().forEach(p => {
    const opt = document.createElement('option');
    opt.value = p;
    opt.textContent = p;
    sel.appendChild(opt);
  });
}

function filterGames() {
  const q = document.getElementById('search-input').value.toLowerCase();
  const plat = document.getElementById('platform-filter').value.toLowerCase();
  const filtered = allGames.filter(g => {
    const mQ = !q || [g.title, g.developer, g.publisher, g.platform, g.key_features]
      .some(f => f && f.toLowerCase().includes(q));
    const mP = !plat || (g.platform && g.platform.toLowerCase().includes(plat));
    return mQ && mP;
  });
  document.getElementById('result-count').textContent = filtered.length;
  renderGames(filtered);
}

function renderGames(games) {
  const grid = document.getElementById('game-grid');
  if (!games.length) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="emoji">🎮</div>
        <h3>No games found</h3>
        <p>Try a different search or filter.</p>
      </div>`;
    return;
  }

  grid.innerHTML = games.map((g, i) => {
    const na = v => (!v || v === 'Not Available') ? null : v;
    const val = v => na(v)
      ? `<span class="field-value">${escHtml(v)}</span>`
      : `<span class="field-value na">Not Available</span>`;

    const scoreHtml = na(g.score)
      ? `<div class="score-badge">${escHtml(g.score)}</div>`
      : `<div class="score-badge na">NO SCORE</div>`;

    const dateTag = na(g.release_date)
      ? `<span class="tag">📅 ${escHtml(g.release_date)}</span>` : '';

    const platTags = na(g.platform)
      ? g.platform.split(/,|\//).slice(0, 3)
          .map(p => `<span class="tag platform">${escHtml(p.trim())}</span>`).join('')
      : '<span class="tag">Platform N/A</span>';

    const scraped = g.scraped_at
      ? new Date(g.scraped_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : '';

    const imageHtml = g.image_url
      ? `<img class="card-image" src="${escHtml(g.image_url)}" alt="${escHtml(g.title)}" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('div'), {className:'card-image-placeholder', textContent:'🎮'}))">`
      : `<div class="card-image-placeholder">🎮</div>`;

    return `
      <div class="game-card" style="animation-delay:${i * 35}ms">
        ${imageHtml}
        <div class="card-body">
          <div class="card-header">
            <div class="game-title">${escHtml(g.title || 'Unknown')}</div>
            ${scoreHtml}
          </div>
          <div class="card-meta">${dateTag}${platTags}</div>
          <div class="field-row">
            <div class="field-label">Key Features</div>
            <div class="features-text">${escHtml(na(g.key_features) || 'Not Available')}</div>
          </div>
          <div class="field-row">
            <div class="field-label">Developer</div>
            ${val(g.developer)}
          </div>
          <div class="field-row">
            <div class="field-label">Publisher</div>
            ${val(g.publisher)}
          </div>
          <div class="card-footer">
            <a class="source-link" href="${escHtml(g.source_url || '#')}" target="_blank" rel="noopener">
              View on Polygon →
            </a>
            ${scraped ? `<span class="scraped-at">Scraped ${scraped}</span>` : ''}
          </div>
        </div>
      </div>`;
  }).join('');
}

function setView(mode) {
  document.getElementById('game-grid').classList.toggle('list-view', mode === 'list');
  document.getElementById('grid-btn').classList.toggle('active', mode === 'grid');
  document.getElementById('list-btn').classList.toggle('active', mode === 'list');
}

// Allow Enter key to trigger scrape
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('url-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') startScrape();
  });
});