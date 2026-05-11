// =============================================
//  app.js — Main Index Page Logic
// =============================================

const PER_PAGE = 50;
let allData = [];
let filtered = [];
let currentPage = 1;
let currentView = localStorage.getItem('view') || 'grid';
let currentFilter = 'all';
let searchQuery = '';
let searchTimeout = null;

// ---- Theme ----
(function initTheme() {
  const saved = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  document.getElementById('theme-toggle').textContent = saved === 'dark' ? '☀️' : '🌙';
})();

document.getElementById('theme-toggle').addEventListener('click', () => {
  const html = document.documentElement;
  const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  document.getElementById('theme-toggle').textContent = next === 'dark' ? '☀️' : '🌙';
});

// ---- Load Data ----
async function loadData() {
  const bar = document.getElementById('loader-bar');
  const txt = document.getElementById('loader-text');
  const dataFile = 'bukhari.json';

  try {
    const response = await fetch(dataFile);
    if (!response.ok) throw new Error('فشل تحميل البيانات');

    const total = parseInt(response.headers.get('Content-Length') || '0');
    const reader = response.body.getReader();
    let received = 0;
    const chunks = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.length;
      if (total > 0) {
        const pct = Math.min(90, (received / total) * 90);
        bar.style.width = pct + '%';
        txt.textContent = `جارٍ التحميل... ${Math.round(pct)}%`;
      } else {
        const mb = (received / 1024 / 1024).toFixed(1);
        txt.textContent = `جارٍ التحميل... ${mb} ميجابايت`;
        bar.style.width = Math.min(85, received / 600000 * 85) + '%';
      }
    }

    txt.textContent = 'جارٍ معالجة البيانات...';
    bar.style.width = '95%';

    const merged = new Uint8Array(received);
    let offset = 0;
    for (const c of chunks) { merged.set(c, offset); offset += c.length; }
    const text = new TextDecoder('utf-8').decode(merged);
    allData = JSON.parse(text);

    bar.style.width = '100%';
    txt.textContent = `تم تحميل ${allData.length.toLocaleString('ar-EG')} حديث ✓`;

    document.getElementById('total-count').textContent = allData.length.toLocaleString('ar-EG');

    setTimeout(() => {
      const ls = document.getElementById('loading-screen');
      ls.classList.add('hidden');
      setTimeout(() => ls.remove(), 600);
    }, 400);

    initPage();

  } catch (err) {
    txt.textContent = '❌ ' + err.message;
    bar.style.background = '#e53e3e';
  }
}

// ---- Init Page ----
function initPage() {
  setView(currentView, true);
  applyFilters();

  // Restore from URL
  const params = new URLSearchParams(location.search);
  if (params.get('q')) {
    const q = params.get('q');
    document.getElementById('main-search').value = q;
    searchQuery = q;
    applyFilters();
  }
  if (params.get('page')) {
    currentPage = parseInt(params.get('page')) || 1;
  }

  render();
}

// ---- Search ----
document.getElementById('main-search').addEventListener('input', e => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    searchQuery = e.target.value.trim();
    currentPage = 1;
    applyFilters();
    render();
    updateURL();
  }, 300);
});

document.getElementById('main-search').addEventListener('keydown', e => {
  if (e.key === 'Enter' && filtered.length === 1) {
    window.location.href = `hadith?id=${filtered[0].number}`;
  }
});

// ---- Filters ----
function setFilter(f) {
  currentFilter = f;
  currentPage = 1;
  document.getElementById('filter-all').classList.toggle('active', f === 'all');
  document.getElementById('filter-desc').classList.toggle('active', f === 'desc');
  applyFilters();
  render();
}

function applyFilters() {
  let data = allData;

  if (currentFilter === 'desc') {
    data = data.filter(h => h.description && h.description.trim());
  }

  if (searchQuery) {
    const q = normalizeAr(searchQuery);
    data = data.filter(h => {
      const st = normalizeAr(h.searchTerm || '');
      const num = String(h.number);
      return st.includes(q) || num.includes(searchQuery);
    });
  }

  filtered = data;
  document.getElementById('showing-count').textContent = filtered.length.toLocaleString('ar-EG');
}

function normalizeAr(s) {
  return s
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/أ|إ|آ/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .toLowerCase()
    .trim();
}

// ---- View ----
function setView(v, silent = false) {
  currentView = v;
  if (!silent) localStorage.setItem('view', v);
  const c = document.getElementById('hadiths-container');
  c.className = v === 'grid' ? 'view-grid' : 'view-list';
  document.getElementById('view-grid-btn').classList.toggle('active', v === 'grid');
  document.getElementById('view-list-btn').classList.toggle('active', v === 'list');
}

// ---- Render ----
function render() {
  const container = document.getElementById('hadiths-container');
  const start = (currentPage - 1) * PER_PAGE;
  const page = filtered.slice(start, start + PER_PAGE);

  if (filtered.length === 0) {
    container.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <div class="icon">🔍</div>
      <h3>لا توجد نتائج</h3>
      <p>جرّب كلمات بحث مختلفة</p>
    </div>`;
    document.getElementById('pagination').innerHTML = '';
    return;
  }

  const q = searchQuery ? normalizeAr(searchQuery) : '';
  container.innerHTML = page.map(h => createCard(h, q)).join('');
  renderPagination();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function createCard(h, q) {
  const text = h.searchTerm || h.hadith || '';
  const preview = text.length > 220 ? text.slice(0, 220) + '...' : text;
  const highlighted = q ? highlight(preview, q) : escapeHtml(preview);
  const hasDesc = h.description && h.description.trim();

  return `<a href="hadith?id=${h.number}" class="hadith-card">
    <div class="card-header">
      <div class="card-number">${h.number}</div>
      <div class="card-title">حديث رقم ${h.number.toLocaleString('ar-EG')}</div>
    </div>
    <div class="card-text">${highlighted}</div>
    <div class="card-footer">
      ${hasDesc ? '<span class="has-desc">📖 مع الشرح</span>' : '<span></span>'}
      <span class="card-arrow">←</span>
    </div>
  </a>`;
}

function highlight(text, q) {
  if (!q) return escapeHtml(text);
  const escaped = escapeHtml(text);
  const escapedQ = escapeHtml(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return escaped.replace(new RegExp(escapedQ, 'gi'), m => `<mark>${m}</mark>`);
}

function escapeHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ---- Pagination ----
function renderPagination() {
  const total = Math.ceil(filtered.length / PER_PAGE);
  if (total <= 1) { document.getElementById('pagination').innerHTML = ''; return; }

  const pages = getPageRange(currentPage, total);
  let html = '';

  html += `<button class="page-btn" onclick="goPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>→</button>`;

  for (const p of pages) {
    if (p === '...') {
      html += `<span style="padding:0 4px;color:var(--text-muted)">…</span>`;
    } else {
      html += `<button class="page-btn ${p === currentPage ? 'active' : ''}" onclick="goPage(${p})">${p.toLocaleString('ar-EG')}</button>`;
    }
  }

  html += `<button class="page-btn" onclick="goPage(${currentPage + 1})" ${currentPage === total ? 'disabled' : ''}>←</button>`;

  document.getElementById('pagination').innerHTML = html;
}

function getPageRange(cur, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const range = [];
  range.push(1);
  if (cur > 3) range.push('...');
  for (let i = Math.max(2, cur - 1); i <= Math.min(total - 1, cur + 1); i++) range.push(i);
  if (cur < total - 2) range.push('...');
  range.push(total);
  return range;
}

function goPage(p) {
  const total = Math.ceil(filtered.length / PER_PAGE);
  if (p < 1 || p > total) return;
  currentPage = p;
  render();
  updateURL();
}

function updateURL() {
  const params = new URLSearchParams();
  if (searchQuery) params.set('q', searchQuery);
  if (currentPage > 1) params.set('page', currentPage);
  const str = params.toString();
  history.replaceState({}, '', str ? '?' + str : location.pathname);
}

// ---- Back to Top ----
const btt = document.getElementById('back-to-top');
window.addEventListener('scroll', () => {
  btt.classList.toggle('visible', window.scrollY > 400);
  const h = document.documentElement;
  const pct = (window.scrollY / (h.scrollHeight - h.clientHeight)) * 100;
  document.getElementById('top-progress').style.width = pct + '%';
}, { passive: true });

// ---- Start ----
loadData();
