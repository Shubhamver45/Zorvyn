'use strict';

const API = '/api';

// ── State ─────────────────────────────────────────────────────────────────────
let token       = localStorage.getItem('zorvyn_token') || null;
let currentUser = JSON.parse(localStorage.getItem('zorvyn_user') || 'null');
let overviewPeriod   = 'week';
let analyticsPeriod  = 3;
let txPage = 1;

// ── Boot ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (token && currentUser) { revealDashboard(); }
  else { showView('login'); }
  bindLogin();
});

// ── View Control ──────────────────────────────────────────────────────────────
function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(`${name}-view`).classList.add('active');
}
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(`page-${name}`).classList.add('active');
  document.querySelectorAll('.sb-link').forEach(a => {
    a.classList.toggle('active', a.dataset.page === name);
  });
}

// ── Auth ──────────────────────────────────────────────────────────────────────
function bindLogin() {
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('login-error');
    const btn   = document.getElementById('login-btn-text');
    errEl.textContent = '';
    btn.textContent = 'Signing in…';

    const data = await post('/auth/login', {
      email:    document.getElementById('email').value,
      password: document.getElementById('password').value,
    });

    btn.textContent = 'Sign In';
    if (data?.success) {
      token = data.data.accessToken;
      currentUser = data.data.user;
      localStorage.setItem('zorvyn_token', token);
      localStorage.setItem('zorvyn_user', JSON.stringify(currentUser));
      revealDashboard();
    } else {
      errEl.textContent = data?.message || 'Invalid credentials.';
    }
  });
}

function revealDashboard() {
  const u = currentUser;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';

  el('greeting-time').textContent = greeting;
  el('greeting-name').textContent = u.name.split(' ')[0];
  el('user-name').textContent     = u.name;
  el('user-role').textContent     = u.role;
  el('user-avatar').textContent   = u.name.charAt(0).toUpperCase();
  el('overview-date').textContent = new Date().toLocaleDateString('en-IN', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

  bindNav();
  bindTransactions();
  bindPeriodTabs('#page-overview .period-tab', v => { overviewPeriod = v; loadOverview(); });
  bindPeriodTabs('#page-analytics .period-tab', v => { analyticsPeriod = parseInt(v); loadAnalytics(); });

  el('refresh-btn').addEventListener('click', loadOverview);
  el('logout-btn').addEventListener('click', logout);

  const canWrite = ['ANALYST','ADMIN'].includes(u.role);
  el('add-record-btn').style.display = canWrite ? '' : 'none';

  showView('dashboard');
  navigate('overview');
}

function logout() {
  token = null; currentUser = null;
  localStorage.removeItem('zorvyn_token');
  localStorage.removeItem('zorvyn_user');
  showView('login');
}

function bindNav() {
  document.querySelectorAll('.sb-link').forEach(a => {
    a.addEventListener('click', (e) => { e.preventDefault(); navigate(a.dataset.page); });
  });
}

function navigate(page) {
  showPage(page);
  if (page === 'overview')     loadOverview();
  if (page === 'transactions') loadTransactions();
  if (page === 'analytics')    loadAnalytics();
  if (page === 'settings')     loadSettings();
}

function bindPeriodTabs(selector, cb) {
  document.querySelectorAll(selector).forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll(selector).forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      cb(e.target.dataset.period);
    });
  });
}

// ── API Helpers ───────────────────────────────────────────────────────────────
async function apiFetch(ep, opts = {}) {
  try {
    const res = await fetch(API + ep, {
      ...opts,
      headers: { 'Content-Type':'application/json', ...(token ? { Authorization:`Bearer ${token}` } : {}), ...opts.headers },
    });
    if (res.status === 401) { logout(); return null; }
    if (res.status === 204) return { success: true };
    return res.json();
  } catch { return null; }
}
const get   = ep => apiFetch(ep);
const post  = (ep, b) => apiFetch(ep, { method:'POST',  body: JSON.stringify(b) });
const patch = (ep, b) => apiFetch(ep, { method:'PATCH', body: JSON.stringify(b) });
const del   = ep => apiFetch(ep, { method:'DELETE' });

// ── Overview ──────────────────────────────────────────────────────────────────
async function loadOverview() {
  const [sum, cats, recent] = await Promise.all([
    get(`/dashboard/summary?period=${overviewPeriod}`),
    get(`/dashboard/categories?period=${overviewPeriod}`),
    get(`/dashboard/recent?limit=8`),
  ]);
  if (sum?.success)    renderKPIs(sum.data);
  if (cats?.success)   renderCategoryList(cats.data, 'category-container');
  if (recent?.success) renderActivityList(recent.data);
}

function renderKPIs(d) {
  animateNumber('stat-income',  d.totalIncome);
  animateNumber('stat-expense', d.totalExpenses);
  animateNumber('stat-balance', d.netBalance);
  el('stat-count').textContent = d.recordCount;

  const max = Math.max(d.totalIncome, d.totalExpenses, 1);
  el('bar-income').style.width  = `${Math.min((d.totalIncome  / max) * 100, 100)}%`;
  el('bar-expense').style.width = `${Math.min((d.totalExpenses/ max) * 100, 100)}%`;

  const balEl = el('balance-indicator');
  if (d.netBalance >= 0) {
    balEl.textContent = `▲ Positive — ${fmt(d.netBalance)} surplus`;
    balEl.style.color = 'var(--income)';
  } else {
    balEl.textContent = `▼ Deficit — ${fmt(Math.abs(d.netBalance))}`;
    balEl.style.color = 'var(--expense)';
  }
}

// ── Category List ─────────────────────────────────────────────────────────────
const CAT_COLORS = ['#6366f1','#10b981','#f59e0b','#8b5cf6','#06b6d4','#ec4899','#14b8a6','#f97316','#84cc16'];
function renderCategoryList(cats, containerId) {
  const container = el(containerId);
  const visible = cats?.filter(c => c.income > 0 || c.expense > 0) || [];
  if (!visible.length) { container.innerHTML = '<p class="empty-msg">No data for this period.</p>'; return; }
  const maxVal = Math.max(...visible.map(c => Math.max(c.income, c.expense)), 1);

  container.innerHTML = visible.map((c, i) => {
    const isInc  = c.net >= 0;
    const color  = CAT_COLORS[i % CAT_COLORS.length];
    const pct    = Math.max((Math.max(c.income, c.expense) / maxVal) * 100, 5);
    return `<div class="cat-item">
      <div class="cat-dot" style="background:${color}"></div>
      <div class="cat-meta">
        <span class="cat-name">${c.category}</span>
        <div class="cat-track"><div class="cat-fill" style="width:${pct}%;background:${color}"></div></div>
      </div>
      <span class="cat-amount ${isInc ? 'tbl-inc':'tbl-exp'}">${isInc?'+':'-'}${fmt(Math.abs(c.net))}</span>
    </div>`;
  }).join('');
}

// ── Activity List ─────────────────────────────────────────────────────────────
function renderActivityList(records) {
  const container = el('activity-list');
  if (!records?.length) { container.innerHTML = '<p class="empty-msg">No recent transactions.</p>'; return; }
  container.innerHTML = records.map(r => {
    const isInc = r.type === 'INCOME';
    const emoji = isInc ? '📈' : '📉';
    return `<div class="activity-row">
      <div class="act-icon ${isInc ? 'act-icon-income':'act-icon-expense'}">${emoji}</div>
      <div class="act-body">
        <div class="act-desc">${r.description || r.category}</div>
        <div class="act-meta">${r.category} · ${fmtDate(r.date)}</div>
      </div>
      <div class="act-amt ${isInc?'inc':'exp'}">${isInc?'+':'-'}${fmt(r.amount)}</div>
    </div>`;
  }).join('');
}

// ── Transactions ──────────────────────────────────────────────────────────────
function bindTransactions() {
  let t;
  el('filter-search').addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { txPage=1; loadTransactions(); }, 400); });
  ['filter-type','filter-category','filter-start','filter-end'].forEach(id => el(id).addEventListener('change', () => { txPage=1; loadTransactions(); }));
  el('filter-reset').addEventListener('click', () => {
    ['filter-search','filter-start','filter-end'].forEach(id => el(id).value='');
    ['filter-type','filter-category'].forEach(id => el(id).value='');
    txPage=1; loadTransactions();
  });
  el('pag-prev').addEventListener('click', () => { if(txPage>1){txPage--;loadTransactions();} });
  el('pag-next').addEventListener('click', () => { txPage++; loadTransactions(); });
  el('add-record-btn').addEventListener('click', () => openModal());
  el('modal-close').addEventListener('click', closeModal);
  el('modal-cancel').addEventListener('click', closeModal);
  el('record-modal').addEventListener('click', e => { if(e.target===el('record-modal')) closeModal(); });
  el('record-form').addEventListener('submit', saveRecord);
}

async function loadTransactions() {
  const tbody = el('transactions-table-body');
  tbody.innerHTML = `<tr><td colspan="6" class="tbl-empty">Loading…</td></tr>`;
  const p = new URLSearchParams({ page:txPage, limit:10, sortBy:'date', sortOrder:'desc' });
  const s = el('filter-search').value.trim();
  const t = el('filter-type').value;
  const c = el('filter-category').value;
  const sd= el('filter-start').value;
  const ed= el('filter-end').value;
  if(s)  p.set('search',s);
  if(t)  p.set('type',t);
  if(c)  p.set('category',c);
  if(sd) p.set('startDate',sd);
  if(ed) p.set('endDate',ed);

  const data = await get(`/records?${p}`);
  if (!data?.success) { tbody.innerHTML=`<tr><td colspan="6" class="tbl-empty">Failed to load.</td></tr>`; return; }

  const isAdmin = currentUser?.role==='ADMIN';
  const canWrite= ['ANALYST','ADMIN'].includes(currentUser?.role);

  if (!data.data.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="tbl-empty">No transactions found.</td></tr>`;
  } else {
    tbody.innerHTML = data.data.map(r => {
      const isInc  = r.type==='INCOME';
      const isMine = r.author?.id===currentUser?.id;
      const canEdit= canWrite && (isMine||isAdmin);
      const actions= canEdit
        ? `<div class="act-btns"><button class="tbl-btn" onclick="openModal('${r.id}')">Edit</button><button class="tbl-btn del" onclick="doDelete('${r.id}')">Delete</button></div>`
        : `<span style="color:var(--txt-3);font-size:12px">View only</span>`;
      return `<tr>
        <td style="color:var(--txt-2)">${fmtDate(r.date)}</td>
        <td style="font-weight:500">${r.description||'—'}</td>
        <td><span class="chip chip-cat">${r.category}</span></td>
        <td><span class="chip ${isInc?'chip-income':'chip-expense'}">${r.type}</span></td>
        <td class="${isInc?'tbl-inc':'tbl-exp'}">${isInc?'+':'-'}${fmt(r.amount)}</td>
        <td>${actions}</td>
      </tr>`;
    }).join('');
  }

  const m = data.meta;
  el('pag-info').textContent = `Page ${m.page} of ${m.totalPages||1}`;
  el('pag-prev').disabled = m.page <= 1;
  el('pag-next').disabled = m.page >= (m.totalPages||1);
}

// ── Modal ─────────────────────────────────────────────────────────────────────
async function openModal(id = null) {
  el('modal-error').textContent = '';
  el('rec-id').value = '';
  el('record-form').reset();
  el('rec-date').value = new Date().toISOString().split('T')[0];
  el('modal-title').textContent = id ? 'Edit Transaction' : 'New Transaction';

  if (id) {
    const d = await get(`/records/${id}`);
    if (d?.success) {
      const r = d.data;
      el('rec-id').value   = r.id;
      el('rec-amount').value = r.amount;
      el('rec-type').value   = r.type;
      el('rec-category').value = r.category;
      el('rec-date').value   = r.date.split('T')[0];
      el('rec-desc').value   = r.description || '';
    }
  }
  el('record-modal').classList.remove('hidden');
}
function closeModal() { el('record-modal').classList.add('hidden'); }

async function saveRecord(e) {
  e.preventDefault();
  const id = el('rec-id').value;
  const payload = {
    amount:      parseFloat(el('rec-amount').value),
    type:        el('rec-type').value,
    category:    el('rec-category').value,
    date:        el('rec-date').value,
    description: el('rec-desc').value,
  };
  const btn = el('modal-save');
  btn.textContent = 'Saving…'; btn.disabled = true;
  const data = id ? await patch(`/records/${id}`, payload) : await post('/records', payload);
  btn.textContent = 'Save Transaction'; btn.disabled = false;

  if (data?.success) { closeModal(); toast(id?'Transaction updated':'Transaction created','success'); loadTransactions(); }
  else { el('modal-error').textContent = data?.message || 'Failed to save.'; }
}

async function doDelete(id) {
  if (!confirm('Delete this transaction?')) return;
  const d = await del(`/records/${id}`);
  if (d?.success) { toast('Transaction deleted','success'); loadTransactions(); }
  else { toast(d?.message || 'Failed to delete','error'); }
}

// ── Analytics ─────────────────────────────────────────────────────────────────
async function loadAnalytics() {
  const [sum, trend, cats] = await Promise.all([
    get('/dashboard/summary?period=year'),
    get(`/dashboard/trends/monthly?months=${analyticsPeriod}`),
    get('/dashboard/categories?period=year'),
  ]);

  if (sum?.success) {
    const d = sum.data;
    animateNumber('an-income',  d.totalIncome);
    animateNumber('an-expense', d.totalExpenses);
    animateNumber('an-balance', d.netBalance);
    const rate = d.totalIncome > 0 ? Math.round(((d.totalIncome - d.totalExpenses) / d.totalIncome) * 100) : 0;
    el('an-rate').textContent = `${rate}%`;
    el('an-rate').style.color = rate >= 0 ? 'var(--income)' : 'var(--expense)';
  }

  if (trend?.success) renderBarChart(trend.data);
  if (cats?.success)  renderCategoryList(cats.data, 'analytics-category-list');
}

function renderBarChart(data) {
  const container = el('bar-chart');
  if (!data?.length) { container.innerHTML = '<p class="empty-msg">No trend data.</p>'; return; }
  const maxVal = Math.max(...data.flatMap(d => [d.income, d.expense]), 1);
  const H = 150;
  const scale = v => Math.max((v / maxVal) * H, v > 0 ? 4 : 0);

  container.innerHTML = data.map(d => {
    const [yr, mo] = d.month.split('-');
    const lbl = new Date(parseInt(yr), parseInt(mo)-1).toLocaleString('default', { month:'short' });
    return `<div class="bar-group">
      <div class="bar-pair">
        <div class="bar bar-inc" style="height:${scale(d.income)}px"  data-tip="${fmt(d.income)} income"></div>
        <div class="bar bar-exp" style="height:${scale(d.expense)}px" data-tip="${fmt(d.expense)} expense"></div>
      </div>
      <span class="bar-month-label">${lbl}</span>
    </div>`;
  }).join('');
}

// ── Settings ──────────────────────────────────────────────────────────────────
async function loadSettings() {
  const u = currentUser;
  el('settings-avatar').textContent = u.name.charAt(0).toUpperCase();
  el('settings-name').textContent   = u.name;
  el('settings-email').textContent  = u.email;
  el('settings-role').textContent   = u.role;

  const card = el('admin-users-card');
  if (u.role !== 'ADMIN') { card.style.display='none'; return; }
  card.style.display = '';

  const data = await get('/users?limit=50');
  const tbody = el('users-table-body');
  if (!data?.success) { tbody.innerHTML=`<tr><td colspan="5" class="tbl-empty">Failed to load.</td></tr>`; return; }

  tbody.innerHTML = data.data.map(user => {
    const active= user.status==='ACTIVE';
    const isSelf= user.id===currentUser.id;
    const ctrl  = isSelf ? '—' : `<button class="tbl-btn${active?' del':''}" onclick="toggleUser('${user.id}','${user.status}')">${active?'Deactivate':'Activate'}</button>`;
    return `<tr>
      <td style="font-weight:600">${user.name}${isSelf?' <small style="color:var(--txt-3)">(you)</small>':''}</td>
      <td style="color:var(--txt-2)">${user.email}</td>
      <td><span class="chip chip-cat">${user.role}</span></td>
      <td><span class="chip ${active?'chip-income':'chip-expense'}">${user.status}</span></td>
      <td>${ctrl}</td>
    </tr>`;
  }).join('');
}

async function toggleUser(id, status) {
  const deact = status === 'ACTIVE';
  const data  = deact
    ? await apiFetch(`/users/${id}/deactivate`, { method:'PATCH' })
    : await patch(`/users/${id}`, { status:'ACTIVE' });
  if (data?.success) { toast(`User ${deact?'deactivated':'activated'}`, 'success'); loadSettings(); }
  else { toast(data?.message || 'Action failed', 'error'); }
}

// ── Animated Number Counter ───────────────────────────────────────────────────
function animateNumber(id, target) {
  const el2 = el(id);
  const start = 0;
  const duration = 900;
  const startTime = performance.now();
  const isNeg = target < 0;
  const abs   = Math.abs(target);

  function tick(now) {
    const pct = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - pct, 3); // ease-out cubic
    const val   = abs * eased;
    el2.textContent = (isNeg ? '-' : '') + fmt(val);
    if (pct < 1) requestAnimationFrame(tick);
    else el2.textContent = (isNeg ? '-' : '') + fmt(abs);
  }
  requestAnimationFrame(tick);
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function toast(msg, type = 'info') {
  const icons = { success:'✅', error:'❌', info:'ℹ️' };
  const c = el('toast-container');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${icons[type]}</span><span>${msg}</span>`;
  c.appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, 3000);
}

// ── Utils ─────────────────────────────────────────────────────────────────────
const el      = id => document.getElementById(id);
const fmt     = v  => new Intl.NumberFormat('en-IN', { style:'currency', currency:'INR', maximumFractionDigits:0 }).format(v||0);
const fmtDate = s  => new Date(s).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
