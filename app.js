// =============================================
//  app.js — API خارجي دائم (بدون Replit)
//  المصدر: api.hadith.gading.dev
// =============================================

const API_BASE = 'https://api.hadith.gading.dev/books/bukhari';
const PER_PAGE = 50;
const TOTAL = 6638;

let currentPage = 1;
let currentView = localStorage.getItem('view') || 'grid';
let searchQuery = '';
let searchTimeout = null;
let isLoading = false;

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

// ---- Load page from external API ----
async function loadPage() {
  if (isLoading) return;
  isLoading = true;

  const container = document.getElementById('hadiths-container');
  container.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-muted)">
    <div style="font-size:2rem;margin-bottom:12px">⏳</div>
    <div>جارٍ التحميل...</div>
  </div>`;

  const start = (currentPage - 1) * PER_PAGE + 1;
  const end = Math.min(currentPage * PER_PAGE, TOTAL);

  try {
    const res = await fetch(`${API_BASE}?range=${start}-${end}`);
    if (!res.ok) throw new Error('فشل الاتصال');
    const json = await res.json();

    const hadiths = json.data?.hadiths || [];
    const totalPages = Math.ceil(TOTAL / PER_PAGE);

    document.getElementById('showing-count').textContent = TOTAL.toLocaleString('ar-EG');
    document.getElementById('total-count').textContent = TOTAL.toLocaleString('ar-EG');

    renderCards(hadiths);
    renderPagination(totalPages, currentPage);
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

// ---- Search by number ----
async function searchByNumber(num) {
  if (isLoading) return;
  isLoading = true;

  const container = document.getElementById('hadiths-container');
  container.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-muted)"><div style="font-size:2rem">⏳</div><div>جارٍ البحث...</div></div>`;

  try {
    const res = await fetch(`${API_BASE}/${num}`);
    if (!res.ok) throw new Error('الحديث غير موجود');
    const json = await res.json();
    const h = json.data?.contents;

    if (!h) throw new Error('الحديث غير موجود');

    document.getElementById('showing-count').textContent = '١';
    renderCards([h]);
    document.getElementById('pagination').innerHTML =
      `<button class="page-btn" onclick="clearSearch()">↩ عرض الكل</button>`;

  } catch (err) {
    container.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <div class="icon">🔍</div>
      <h3>لا توجد نتائج</h3>
      <p>${err.message}</p>
    </div>`;
    document.getElementById('pagination').innerHTML =
      `<button class="page-btn" onclick="clearSearch()">↩ عرض الكل</button>`;
  } finally {
    isLoading = false;
  }
}

function clearSearch() {
  searchQuery = '';
  document.getElementById('main-search').value = '';
  currentPage = 1;
  updateURL();
  loadPage();
}

// ---- Render Cards ----
function renderCards(hadiths) {
  const container = document.getElementById('hadiths-container');

  if (!hadiths || hadiths.length === 0) {
    container.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <div class="icon">🔍</div><h3>لا توجد نتائج</h3>
    </div>`;
    return;
  }

  container.innerHTML = hadiths.map(h => createCard(h)).join('');
}

function createCard(h) {
  const text = h.arab || '';
  const preview = text.length > 220 ? text.slice(0, 220) + '...' : text;

  return `<a href="hadith.html?id=${h.number}" class="hadith-card">
    <div class="card-header">
      <div class="card-number">${h.number}</div>
      <div class="card-title">حديث رقم ${Number(h.number).toLocaleString('ar-EG')}</div>
    </div>
    <div class="card-text">${escapeHtml(preview)}</div>
    <div class="card-footer">
      <span></span>
      <span class="card-arrow">←</span>
    </div>
  </a>`;
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ---- Search ----
document.getElementById('main-search').addEventListener('input', e => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    searchQuery = e.target.value.trim();
    const num = parseInt(searchQuery);
    if (searchQuery === '') {
      currentPage = 1;
      loadPage();
    } else if (!isNaN(num) && num >= 1 && num <= TOTAL) {
      searchByNumber(num);
    } else {
      document.getElementById('hadiths-container').innerHTML = `<div class="empty-state" style="grid-column:1/-1">
        <div class="icon">🔢</div>
        <h3>ادخل رقم الحديث للبحث</h3>
        <p>مثال: 1، 100، 500</p>
        <p style="margin-top:8px;font-size:.85rem;color:var(--text-muted)">البحث النصي غير متاح في الوضع الحالي</p>
      </div>`;
      document.getElementById('pagination').innerHTML = `<button class="page-btn" onclick="clearSearch()">↩ عرض الكل</button>`;
    }
    updateURL();
  }, 400);
});

document.getElementById('main-search').addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const num = parseInt(e.target.value.trim());
    if (!isNaN(num) && num >= 1 && num <= TOTAL) {
      window.location.href = `hadith.html?id=${num}`;
    }
  }
});

// ---- Filters (مع الشرح غير متاح في الـ API الخارجي) ----
function setFilter(f) {
  if (f === 'desc') {
    alert('فلتر الشرح غير متاح في الوضع الحالي');
    return;
  }
  currentPage = 1;
  document.getElementById('filter-all').classList.add('active');
  document.getElementById('filter-desc').classList.remove('active');
  loadPage();
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
  let html = `<button class="page-btn" onclick="goPage(${current - 1})" ${current === 1 ? 'disabled' : ''}>→</button>`;

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
  const range = [1];
  if (cur > 3) range.push('...');
  for (let i = Math.max(2, cur - 1); i <= Math.min(total - 1, cur + 1); i++) range.push(i);
  if (cur < total - 2) range.push('...');
  range.push(total);
  return range;
}

function goPage(p) {
  const total = Math.ceil(TOTAL / PER_PAGE);
  if (p < 1 || p > total) return;
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
  document.getElementById('filter-all').classList.add('active');

  const params = new URLSearchParams(location.search);
  if (params.get('page')) currentPage = parseInt(params.get('page')) || 1;

  // Hide loading screen fast
  const bar = document.getElementById('loader-bar');
  const txt = document.getElementById('loader-text');
  bar.style.width = '100%';
  txt.textContent = 'جاهز ✓';
  setTimeout(() => {
    const ls = document.getElementById('loading-screen');
    if (ls) { ls.classList.add('hidden'); setTimeout(() => ls.remove(), 500); }
  }, 200);

  loadPage();
})();
