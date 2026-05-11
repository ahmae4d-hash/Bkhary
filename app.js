// =============================================
//  app.js — Main Index Page (API Version)
//  غيّر الرابط التالي برابطك الدائم بعد النشر
// =============================================

const API_BASE = 'https://c5d637d5-8680-45ac-b682-a9b2c3da8ad6-00-2q47k992tfojx.picard.replit.dev/api/bukhari';

const PER_PAGE = 50;
let currentPage = 1;
let currentView = localStorage.getItem('view') || 'grid';
let currentFilter = 'all';
let searchQuery = '';
let searchTimeout = null;
let isLoading = false;
let totalPages = 1;

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

// ---- Build API URL ----
function buildUrl(page, query, filter) {
  if (query) {
    return `${API_BASE}/search?q=${encodeURIComponent(query)}&page=${page}&limit=${PER_PAGE}`;
  }
  let url = `${API_BASE}?page=${page}&limit=${PER_PAGE}`;
  if (filter === 'desc') url += '&hasDesc=true';
  return url;
}

// ---- Load from API ----
async function loadPage() {
  if (isLoading) return;
  isLoading = true;

  const container = document.getElementById('hadiths-container');
  container.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-muted)">
    <div style="font-size:2rem;margin-bottom:12px">⏳</div>
    <div>جارٍ التحميل...</div>
  </div>`;

  try {
    const url = buildUrl(currentPage, searchQuery, currentFilter);
    const res = await fetch(url);
    if (!res.ok) throw new Error('فشل الاتصال بالخادم');
    const json = await res.json();

    totalPages = json.totalPages || 1;
    document.getElementById('showing-count').textContent = json.total.toLocaleString('ar-EG');
    document.getElementById('total-count').textContent = (7008).toLocaleString('ar-EG');

    renderCards(json.data);
    renderPagination(json.totalPages, json.page);
    window.scrollTo({ top: 0, behavior: 'smooth' });

  } catch (err) {
    container.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <div class="icon">❌</div>
      <h3>خطأ في الاتصال</h3>
      <p>${err.message}</p>
    </div>`;
    document.getElementById('pagination').innerHTML = '';
  } finally {
    isLoading = false;
  }
}

// ---- Render Cards ----
function renderCards(hadiths) {
  const container = document.getElementById('hadiths-container');

  if (!hadiths || hadiths.length === 0) {
    container.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <div class="icon">🔍</div>
      <h3>لا توجد نتائج</h3>
      <p>جرّب كلمات بحث مختلفة</p>
    </div>`;
    document.getElementById('pagination').innerHTML = '';
    return;
  }

  const q = searchQuery ? normalizeAr(searchQuery) : '';
  container.innerHTML = hadiths.map(h => createCard(h, q)).join('');
}

function createCard(h, q) {
  const text = h.searchTerm || h.hadith || '';
  const preview = text.length > 220 ? text.slice(0, 220) + '...' : text;
  const highlighted = q ? highlight(preview, q) : escapeHtml(preview);
  const hasDesc = h.description && h.description.trim();

  return `<a href="hadith.html?id=${h.number}" class="hadith-card">
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
  const escapedQ = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return escaped.replace(new RegExp(escapedQ, 'gi'), m => `<mark>${m}</mark>`);
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ---- Search ----
document.getElementById('main-search').addEventListener('input', e => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    searchQuery = e.target.value.trim();
    currentPage = 1;
    loadPage();
    updateURL();
  }, 400);
});

document.getElementById('main-search').addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    clearTimeout(searchTimeout);
    searchQuery = e.target.value.trim();
    currentPage = 1;
    loadPage();
    updateURL();
  }
});

// ---- Filters ----
function setFilter(f) {
  currentFilter = f;
  currentPage = 1;
  document.getElementById('filter-all').classList.toggle('active', f === 'all');
  document.getElementById('filter-desc').classList.toggle('active', f === 'desc');
  loadPage();
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

// ---- Pagination ----
function renderPagination(total, current) {
  if (total <= 1) { document.getElementById('pagination').innerHTML = ''; return; }

  const pages = getPageRange(current, total);
  let html = '';

  html += `<button class="page-btn" onclick="goPage(${current - 1})" ${current === 1 ? 'disabled' : ''}>→</button>`;

  for (const p of pages) {
    if (p === '...') {
      html += `<span style="padding:0 4px;color:var(--text-muted)">…</span>`;
    } else {
      html += `<button class="page-btn ${p === current ? 'active' : ''}" onclick="goPage(${p})">${p.toLocaleString('ar-EG')}</button>`;
    }
  }

  html += `<button class="page-btn" onclick="goPage(${current + 1})" ${current === total ? 'disabled' : ''}>←</button>`;

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
  if (p < 1 || p > totalPages) return;
  currentPage = p;
  loadPage();
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

// ---- Init ----
(function init() {
  setView(currentView, true);

  const params = new URLSearchParams(location.search);
  if (params.get('q')) {
    searchQuery = params.get('q');
    document.getElementById('main-search').value = searchQuery;
  }
  if (params.get('page')) {
    currentPage = parseInt(params.get('page')) || 1;
  }

  // Hide loading screen
  const bar = document.getElementById('loader-bar');
  const txt = document.getElementById('loader-text');
  bar.style.width = '100%';
  txt.textContent = 'جاهز ✓';
  setTimeout(() => {
    const ls = document.getElementById('loading-screen');
    ls.classList.add('hidden');
    setTimeout(() => ls.remove(), 500);
  }, 300);

  loadPage();
})();
