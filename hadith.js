// =============================================
//  hadith.js — Individual Hadith Page Logic
// =============================================

let allData = [];
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
      await navigator.share({
        title: `صحيح البخاري — حديث رقم ${currentId}`,
        url: url
      });
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
    if (q) window.location.href = `index?q=${encodeURIComponent(q)}`;
  }
});

// ---- Load Data ----
async function loadData() {
  const bar = document.getElementById('loader-bar');
  const txt = document.getElementById('loader-text');

  try {
    // Get hadith ID from URL
    const params = new URLSearchParams(location.search);
    const idParam = params.get('id');
    currentId = parseInt(idParam) || 1;

    if (isNaN(currentId) || currentId < 1) {
      showError();
      return;
    }

    const response = await fetch('https://www.dropbox.com/scl/fi/3l3ncqenbh10wmjwbwx4v/bukhari.json?rlkey=6py18tsmw131rx7wlr7sm5dbn&st=7b89j388&dl=1');
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
        bar.style.width = Math.min(90, (received / total) * 90) + '%';
      } else {
        bar.style.width = Math.min(85, received / 600000 * 85) + '%';
      }
    }

    bar.style.width = '95%';
    txt.textContent = 'جارٍ معالجة البيانات...';

    const merged = new Uint8Array(received);
    let offset = 0;
    for (const c of chunks) { merged.set(c, offset); offset += c.length; }
    allData = JSON.parse(new TextDecoder('utf-8').decode(merged));

    bar.style.width = '100%';
    txt.textContent = 'تم ✓';

    setTimeout(() => {
      const ls = document.getElementById('loading-screen');
      ls.classList.add('hidden');
      setTimeout(() => ls.remove(), 500);
    }, 300);

    renderHadith(currentId);

  } catch (err) {
    txt.textContent = '❌ ' + err.message;
    bar.style.background = '#e53e3e';
  }
}

// ---- Render Hadith ----
function renderHadith(id) {
  const hadith = allData.find(h => h.number === id);

  if (!hadith) {
    showError();
    return;
  }

  currentId = id;

  // Update page title
  document.title = `صحيح البخاري — حديث رقم ${id}`;

  // Update meta
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) {
    const preview = (hadith.searchTerm || '').slice(0, 160);
    metaDesc.content = preview;
  }

  // Breadcrumb
  document.getElementById('breadcrumb-num').textContent = `حديث رقم ${id.toLocaleString('ar-EG')}`;
  document.getElementById('hadith-num-display').textContent = id.toLocaleString('ar-EG');

  // Position info
  const pos = allData.findIndex(h => h.number === id) + 1;
  document.getElementById('hadith-position').textContent =
    `${pos.toLocaleString('ar-EG')} من ${allData.length.toLocaleString('ar-EG')}`;

  // Hadith text
  document.getElementById('hadith-text').innerHTML = cleanText(hadith.hadith || '');

  // Description
  const descCard = document.getElementById('desc-card');
  if (hadith.description && hadith.description.trim()) {
    document.getElementById('desc-text').innerHTML = cleanText(hadith.description);
    descCard.style.display = 'block';
  } else {
    descCard.style.display = 'none';
  }

  // Navigation buttons
  const prev = allData.find(h => h.number === id - 1);
  const next = allData.find(h => h.number === id + 1);

  setNavBtn('btn-prev', prev ? `hadith?id=${prev.number}` : null, 'السابق', '←');
  setNavBtn('btn-next', next ? `hadith?id=${next.number}` : null, 'التالي', '→');
  setNavBtn('btn-prev-2', prev ? `hadith?id=${prev.number}` : null, 'السابق', '←');
  setNavBtn('btn-next-2', next ? `hadith?id=${next.number}` : null, 'التالي', '→');

  // Show content
  document.getElementById('hadith-page-content').style.display = 'block';
  document.getElementById('error-state').style.display = 'none';

  // Update URL cleanly
  history.replaceState({ id }, `حديث ${id}`, `hadith?id=${id}`);
}

function setNavBtn(btnId, href, label, arrow) {
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
  // Clean up stray formatting markers common in this dataset
  return text
    .replace(/\u200F|\u200E/g, '')           // Remove directional marks
    .replace(/‏\s*‏/g, ' ')                  // Clean double RTL marks
    .replace(/‏/g, '')                        // Remove lone RTL marks
    .trim();
}

function showError() {
  const ls = document.getElementById('loading-screen');
  ls.classList.add('hidden');
  setTimeout(() => ls.remove(), 500);
  document.getElementById('hadith-page-content').style.display = 'none';
  document.getElementById('error-state').style.display = 'block';
}

// ---- Keyboard Navigation ----
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
    const hadith = allData.find(h => h.number === currentId - 1);
    if (hadith) renderHadith(hadith.number);
  }
  if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
    const hadith = allData.find(h => h.number === currentId + 1);
    if (hadith) renderHadith(hadith.number);
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
