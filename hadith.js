// =============================================
//  hadith.js — Individual Hadith Page (API Version)
//  غيّر الرابط التالي برابطك الدائم بعد النشر
// =============================================

const API_BASE = 'https://c5d637d5-8680-45ac-b682-a9b2c3da8ad6-00-2q47k992tfojx.picard.replit.dev/api/bukhari';
const TOTAL_HADITHS = 7008;

let currentId = 1;

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

// ---- Share Button ----
document.getElementById('share-btn').addEventListener('click', async () => {
  const url = location.href;
  if (navigator.share) {
    try {
      await navigator.share({ title: `صحيح البخاري — حديث رقم ${currentId}`, url });
    } catch (_) {}
  } else {
    await navigator.clipboard.writeText(url);
    const btn = document.getElementById('share-btn');
    btn.textContent = '✅';
    setTimeout(() => btn.textContent = '🔗', 2000);
  }
});

// ---- Search from header ----
document.getElementById('main-search').addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const q = e.target.value.trim();
    if (q) window.location.href = `index.html?q=${encodeURIComponent(q)}`;
  }
});

// ---- Load Hadith from API ----
async function loadData() {
  const bar = document.getElementById('loader-bar');
  const txt = document.getElementById('loader-text');

  const params = new URLSearchParams(location.search);
  const idParam = params.get('id');
  currentId = parseInt(idParam) || 1;

  if (isNaN(currentId) || currentId < 1) {
    showError();
    return;
  }

  try {
    bar.style.width = '60%';
    txt.textContent = 'جارٍ تحميل الحديث...';

    const res = await fetch(`${API_BASE}/${currentId}`);

    if (res.status === 404) {
      showError();
      return;
    }
    if (!res.ok) throw new Error('فشل الاتصال بالخادم');

    const hadith = await res.json();

    bar.style.width = '100%';
    txt.textContent = 'تم ✓';

    setTimeout(() => {
      const ls = document.getElementById('loading-screen');
      ls.classList.add('hidden');
      setTimeout(() => ls.remove(), 500);
    }, 300);

    renderHadith(hadith);

  } catch (err) {
    txt.textContent = '❌ ' + err.message;
    bar.style.background = '#e53e3e';
  }
}

// ---- Render Hadith ----
function renderHadith(hadith) {
  currentId = hadith.number;

  document.title = `صحيح البخاري — حديث رقم ${currentId}`;

  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.content = (hadith.searchTerm || '').slice(0, 160);

  document.getElementById('breadcrumb-num').textContent = `حديث رقم ${currentId.toLocaleString('ar-EG')}`;
  document.getElementById('hadith-num-display').textContent = currentId.toLocaleString('ar-EG');
  document.getElementById('hadith-position').textContent =
    `${currentId.toLocaleString('ar-EG')} من ${TOTAL_HADITHS.toLocaleString('ar-EG')}`;

  document.getElementById('hadith-text').innerHTML = cleanText(hadith.hadith || '');

  const descCard = document.getElementById('desc-card');
  if (hadith.description && hadith.description.trim()) {
    document.getElementById('desc-text').innerHTML = cleanText(hadith.description);
    descCard.style.display = 'block';
  } else {
    descCard.style.display = 'none';
  }

  const prevId = currentId > 1 ? currentId - 1 : null;
  const nextId = currentId < TOTAL_HADITHS ? currentId + 1 : null;

  setNavBtn('btn-prev', prevId ? `hadith.html?id=${prevId}` : null);
  setNavBtn('btn-next', nextId ? `hadith.html?id=${nextId}` : null);
  setNavBtn('btn-prev-2', prevId ? `hadith.html?id=${prevId}` : null);
  setNavBtn('btn-next-2', nextId ? `hadith.html?id=${nextId}` : null);

  document.getElementById('hadith-page-content').style.display = 'block';
  document.getElementById('error-state').style.display = 'none';

  history.replaceState({ id: currentId }, `حديث ${currentId}`, `hadith.html?id=${currentId}`);
}

function setNavBtn(btnId, href) {
  const btn = document.getElementById(btnId);
  if (href) {
    btn.href = href;
    btn.removeAttribute('disabled');
    btn.style.pointerEvents = '';
    btn.style.opacity = '';
  } else {
    btn.href = '#';
    btn.setAttribute('disabled', '');
    btn.style.pointerEvents = 'none';
    btn.style.opacity = '.35';
  }
}

function cleanText(text) {
  if (!text) return '';
  return text
    .replace(/\u200F|\u200E/g, '')
    .replace(/‏\s*‏/g, ' ')
    .replace(/‏/g, '')
    .trim();
}

function showError() {
  const ls = document.getElementById('loading-screen');
  if (ls) { ls.classList.add('hidden'); setTimeout(() => ls.remove(), 500); }
  document.getElementById('hadith-page-content').style.display = 'none';
  document.getElementById('error-state').style.display = 'block';
}

// ---- Keyboard Navigation ----
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
    if (currentId > 1) window.location.href = `hadith.html?id=${currentId - 1}`;
  }
  if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
    if (currentId < TOTAL_HADITHS) window.location.href = `hadith.html?id=${currentId + 1}`;
  }
});

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
