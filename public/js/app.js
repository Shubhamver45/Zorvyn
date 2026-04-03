'use strict';

const API = '/api';

// ── State ─────────────────────────────────────────────────────────────────────
let token = localStorage.getItem('zorvyn_token') || null;
let currentUser = JSON.parse(localStorage.getItem('zorvyn_user') || 'null');
let overviewPeriod = 'week';
let analyticsPeriod = 3;
let txPage = 1;
let txFilters = {};

// ── Boot ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (token && currentUser) {
    revealDashboard();
  } else {
    showView('login');
  }
  bindLoginForm();
});

// ── View Switcher ─────────────────────────────────────────────────────────────
function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active-view'));
  document.getElementById(`${name}-view`).classList.add('active-view');
}

function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active-page'));
  document.getElementById(`page-${name}`).classList.add('active-page');
  document.querySelectorAll('.nav-links li').forEach(li => {
    li.classList.toggle('active', li.dataset.page === name);
  });
}

// ── Auth ──────────────────────────────────────────────────────────────────────
function bindLoginForm() {
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errEl = document.getElementById('login-error');
    const btn = document.getElementById('login-btn');

    btn.innerHTML = 'Signing in…';
    btn.disabled = true;
    errEl.textContent = '';

    const data = await post('/auth/login', { email, password });

    if (data?.success) {
      token = data.data.accessToken;
      currentUser = data.data.user;
      localStorage.setItem('zorvyn_token', token);
      localStorage.setItem('zorvyn_user', JSON.stringify(currentUser));
      revealDashboard();
    } else {
      errEl.textContent = data?.message || 'Login failed. Check your credentials.';
    }
    btn.innerHTML = '<span>Sign In</span>';
    btn.disabled = false;
  });
}

function revealDashboard() {
  // Populate user info
  const u = currentUser;
  el('user-name').textContent = u.name;
  el('user-role').textContent = u.role;
  el('user-avatar').textContent = u.name.charAt(0).toUpperCase();

  // Set today's date subtitle
  const dateEl = el('overview-date');
  if (dateEl) dateEl.textContent = new Date().toLocaleDateString('en-IN', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

  // Show/hide Settings for non-admins (settings still shown but users table hidden for non-admins)
  buildSidebar();
  showView('dashboard');
  navigateTo('overview');

  document.getElementById('logout-btn').addEventListener('click', logout);
}

function buildSidebar() {
  document.querySelectorAll('.nav-links li').forEach(li => {
    li.querySelector('a').addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo(li.dataset.page);
    });
  });

  // Period switcher on Overview
  document.querySelectorAll('#page-overview .pill-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('#page-overview .pill-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      overviewPeriod = e.target.dataset.period;
      loadOverview();
    });
  });

  // Analytics period switcher
  document.querySelectorAll('#page-analytics .pill-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('#page-analytics .pill-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      analyticsPeriod = parseInt(e.target.dataset.period);
      loadAnalytics();
    });
  });

  document.getElementById('refresh-btn').addEventListener('click', loadOverview);
  bindTransactionPage();
}

function navigateTo(page) {
  showPage(page);
  if (page === 'overview')     loadOverview();
  if (page === 'transactions') loadTransactions();
  if (page === 'analytics')    loadAnalytics();
  if (page === 'settings')     loadSettings();
}

function logout() {
  token = null;
  currentUser = null;
  localStorage.removeItem('zorvyn_token');
  localStorage.removeItem('zorvyn_user');
  showView('login');
}

// ── API Helpers ───────────────────────────────────────────────────────────────
async function apiFetch(endpoint, opts = {}) {
  try {
    const res = await fetch(API + endpoint, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...opts.headers,
      },
    });
    if (res.status === 401) { logout(); return null; }
    return res.json();
  } catch {
    return null;
  }
}
const get  = (ep) => apiFetch(ep);
const post = (ep, body) => apiFetch(ep, { method: 'POST', body: JSON.stringify(body) });
const patch = (ep, body) => apiFetch(ep, { method: 'PATCH', body: JSON.stringify(body) });
const del  = (ep) => apiFetch(ep, { method: 'DELETE' });

// ── Overview ─────────────────────────────────────────────────────────────────
async function loadOverview() {
  const [summary, categories, recent] = await Promise.all([
    get(`/dashboard/summary?period=${overviewPeriod}`),
    get(`/dashboard/categories?period=${overviewPeriod}`),
    get(`/dashboard/recent?limit=8`),
  ]);
  if (summary?.success) renderSummaryCards(summary.data, 'stat-income', 'stat-expense', 'stat-balance', 'stat-count');
  if (categories?.success) renderCategories(categories.data, 'category-container');
  if (recent?.success) renderRecentTable(recent.data);
}

function renderSummaryCards(d, incomeId, expenseId, balanceId, countId) {
  el(incomeId).textContent  = fmt(d.totalIncome);
  el(expenseId).textContent = fmt(d.totalExpenses);
  el(balanceId).textContent = fmt(d.netBalance);
  if (countId) el(countId).textContent = d.recordCount;
}

function renderCategories(cats, containerId) {
  const container = el(containerId);
  if (!cats?.length) { container.innerHTML = `<p class="empty-state">No data for this period.</p>`; return; }

  const maxVal = Math.max(...cats.map(c => Math.abs(c.net)), 1);
  container.innerHTML = cats
    .filter(c => c.income > 0 || c.expense > 0)
    .map(c => {
      const isInc = c.net >= 0;
      const pct   = Math.max((Math.abs(c.net) / maxVal) * 100, 5);
      const color = isInc ? 'var(--status-income)' : 'var(--status-expense)';
      return `<div class="cat-item">
        <div class="cat-info">
          <span class="cat-name">${c.category}</span>
          <div class="cat-bar-bg"><div class="cat-bar-fill" style="width:${pct}%;background:${color}"></div></div>
        </div>
        <span class="cat-amt ${isInc ? 'amt-inc' : 'amt-exp'}">${isInc ? '+' : '-'}${fmt(Math.abs(c.net))}</span>
      </div>`;
    }).join('');
}

function renderRecentTable(records) {
  if (!records?.length) {
    el('activity-table-body').innerHTML = `<tr><td colspan="5" class="loading-cell">No recent activity</td></tr>`;
    return;
  }
  el('activity-table-body').innerHTML = records.map(r => {
    const isInc = r.type === 'INCOME';
    return `<tr>
      <td style="color:var(--text-secondary)">${fmtDate(r.date)}</td>
      <td style="font-weight:500">${r.description || '—'}</td>
      <td><span class="tag">${r.category}</span></td>
      <td style="color:var(--text-secondary)">${r.author?.name || '—'}</td>
      <td class="${isInc ? 'amt-inc' : 'amt-exp'}">${isInc ? '+' : '-'}${fmt(r.amount)}</td>
    </tr>`;
  }).join('');
}

// ── Transactions ──────────────────────────────────────────────────────────────
function bindTransactionPage() {
  // Filter inputs — debounce search
  let searchTimer;
  el('filter-search').addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { txPage = 1; loadTransactions(); }, 400);
  });
  ['filter-type', 'filter-category', 'filter-start', 'filter-end'].forEach(id => {
    el(id).addEventListener('change', () => { txPage = 1; loadTransactions(); });
  });
  el('filter-reset').addEventListener('click', () => {
    ['filter-search','filter-start','filter-end'].forEach(id => el(id).value = '');
    ['filter-type','filter-category'].forEach(id => el(id).value = '');
    txPage = 1;
    loadTransactions();
  });

  // Pagination
  el('pag-prev').addEventListener('click', () => { if (txPage > 1) { txPage--; loadTransactions(); } });
  el('pag-next').addEventListener('click', () => { txPage++; loadTransactions(); });

  // Add record button (only visible if ANALYST or ADMIN)
  const addBtn = el('add-record-btn');
  const canWrite = ['ANALYST', 'ADMIN'].includes(currentUser?.role);
  addBtn.style.display = canWrite ? 'inline-flex' : 'none';
  addBtn.addEventListener('click', () => openModal());

  // Modal
  el('modal-close').addEventListener('click', closeModal);
  el('modal-cancel').addEventListener('click', closeModal);
  el('record-modal').addEventListener('click', (e) => { if (e.target === el('record-modal')) closeModal(); });
  el('record-form').addEventListener('submit', handleSaveRecord);
}

async function loadTransactions() {
  const body = el('transactions-table-body');
  body.innerHTML = `<tr><td colspan="6" class="loading-cell">Loading…</td></tr>`;

  const params = new URLSearchParams({
    page: txPage, limit: 10,
    sortBy: 'date', sortOrder: 'desc',
  });
  const search   = el('filter-search').value.trim();
  const type     = el('filter-type').value;
  const category = el('filter-category').value;
  const start    = el('filter-start').value;
  const end      = el('filter-end').value;

  if (search)   params.set('search', search);
  if (type)     params.set('type', type);
  if (category) params.set('category', category);
  if (start)    params.set('startDate', start);
  if (end)      params.set('endDate', end);

  const data = await get(`/records?${params}`);

  if (!data?.success) {
    body.innerHTML = `<tr><td colspan="6" class="loading-cell">Failed to load records.</td></tr>`;
    return;
  }

  const records = data.data;
  const meta    = data.meta;
  const canWrite  = ['ANALYST', 'ADMIN'].includes(currentUser?.role);
  const isAdmin   = currentUser?.role === 'ADMIN';

  if (!records.length) {
    body.innerHTML = `<tr><td colspan="6" class="loading-cell">No transactions found.</td></tr>`;
  } else {
    body.innerHTML = records.map(r => {
      const isInc = r.type === 'INCOME';
      const isMine = r.author?.id === currentUser?.id;
      const canEdit = canWrite && (isMine || isAdmin);
      const actions = canEdit
        ? `<div class="action-btns">
             <button class="act-btn" onclick="openModal('${r.id}')">Edit</button>
             <button class="act-btn del" onclick="handleDelete('${r.id}')">Delete</button>
           </div>`
        : `<span style="color:var(--text-muted);font-size:12px">View only</span>`;
      return `<tr>
        <td style="color:var(--text-secondary)">${fmtDate(r.date)}</td>
        <td style="font-weight:500">${r.description || '—'}</td>
        <td><span class="tag">${r.category}</span></td>
        <td><span class="type-tag ${isInc ? 'type-income' : 'type-expense'}">${r.type}</span></td>
        <td class="${isInc ? 'amt-inc' : 'amt-exp'}">${isInc ? '+' : '-'}${fmt(r.amount)}</td>
        <td>${actions}</td>
      </tr>`;
    }).join('');
  }

  // Pagination controls
  el('pag-info').textContent = `Page ${meta.page} of ${meta.totalPages || 1}`;
  el('pag-prev').disabled = meta.page <= 1;
  el('pag-next').disabled = meta.page >= (meta.totalPages || 1);
}

// ── Modal ─────────────────────────────────────────────────────────────────────
async function openModal(recordId = null) {
  el('modal-error').textContent = '';
  el('rec-id').value = '';
  el('record-form').reset();
  el('rec-date').value = new Date().toISOString().split('T')[0];
  el('modal-title').textContent = recordId ? 'Edit Record' : 'Add Record';

  if (recordId) {
    const data = await get(`/records/${recordId}`);
    if (data?.success) {
      const r = data.data;
      el('rec-id').value = r.id;
      el('rec-amount').value = r.amount;
      el('rec-type').value = r.type;
      el('rec-category').value = r.category;
      el('rec-date').value = r.date.split('T')[0];
      el('rec-desc').value = r.description || '';
    }
  }
  el('record-modal').classList.remove('hidden');
}

function closeModal() {
  el('record-modal').classList.add('hidden');
}

async function handleSaveRecord(e) {
  e.preventDefault();
  const id = el('rec-id').value;
  const payload = {
    amount:      parseFloat(el('rec-amount').value),
    type:        el('rec-type').value,
    category:    el('rec-category').value,
    date:        el('rec-date').value,
    description: el('rec-desc').value,
  };

  const saveBtn = el('modal-save');
  saveBtn.textContent = 'Saving…';
  saveBtn.disabled = true;

  const data = id ? await patch(`/records/${id}`, payload) : await post(`/records`, payload);

  saveBtn.textContent = 'Save Record';
  saveBtn.disabled = false;

  if (data?.success) {
    closeModal();
    toast(id ? 'Record updated successfully' : 'Record created successfully', 'success');
    loadTransactions();
  } else {
    el('modal-error').textContent = data?.message || 'Failed to save record.';
  }
}

async function handleDelete(id) {
  if (!confirm('Are you sure you want to delete this record?')) return;
  const data = await del(`/records/${id}`);
  if (data === null || (typeof data === 'object' && data?.success !== false)) {
    toast('Record deleted', 'success');
    loadTransactions();
  } else {
    toast(data?.message || 'Failed to delete record', 'error');
  }
}

// ── Analytics ─────────────────────────────────────────────────────────────────
async function loadAnalytics() {
  const [summary, months, categories] = await Promise.all([
    get(`/dashboard/summary?period=year`),
    get(`/dashboard/trends/monthly?months=${analyticsPeriod}`),
    get(`/dashboard/categories?period=year`),
  ]);

  if (summary?.success) {
    const d = summary.data;
    el('an-income').textContent  = fmt(d.totalIncome);
    el('an-expense').textContent = fmt(d.totalExpenses);
    el('an-balance').textContent = fmt(d.netBalance);
    const rate = d.totalIncome > 0 ? Math.round(((d.totalIncome - d.totalExpenses) / d.totalIncome) * 100) : 0;
    el('an-rate').textContent = `${rate}%`;
    el('an-rate').className = `stat-value ${rate >= 0 ? 'text-accent-green' : 'text-accent-red'}`;
  }

  if (months?.success)     renderTrendChart(months.data);
  if (categories?.success) renderCategories(categories.data, 'analytics-category-list');
}

function renderTrendChart(data) {
  const container = el('trend-chart');
  if (!data?.length) { container.innerHTML = `<p class="empty-state">No trend data available.</p>`; return; }

  const maxVal = Math.max(...data.flatMap(d => [d.income, d.expense]), 1);
  const BAR_MAX_H = 160;
  const scale = v => Math.max((v / maxVal) * BAR_MAX_H, v > 0 ? 4 : 0);

  container.innerHTML = '';

  // Legend
  const parent = container.parentElement;
  let legend = parent.querySelector('.chart-legend');
  if (!legend) {
    legend = document.createElement('div');
    legend.className = 'chart-legend';
    legend.innerHTML = `
      <div class="legend-item"><div class="legend-dot" style="background:var(--status-income)"></div> Income</div>
      <div class="legend-item"><div class="legend-dot" style="background:var(--status-expense)"></div> Expenses</div>
    `;
    parent.insertBefore(legend, container);
  }

  data.forEach(d => {
    const [year, month] = d.month.split('-');
    const label = new Date(parseInt(year), parseInt(month) - 1).toLocaleString('default', { month: 'short' });

    const group = document.createElement('div');
    group.className = 'chart-group';
    group.innerHTML = `
      <div class="chart-bars">
        <div class="chart-bar bar-income"  style="height:${scale(d.income)}px"  data-val="${fmt(d.income)}"></div>
        <div class="chart-bar bar-expense" style="height:${scale(d.expense)}px" data-val="${fmt(d.expense)}"></div>
      </div>
      <span class="chart-month">${label}</span>
    `;
    container.appendChild(group);
  });
}

// ── Settings ──────────────────────────────────────────────────────────────────
async function loadSettings() {
  const u = currentUser;
  el('settings-avatar').textContent = u.name.charAt(0).toUpperCase();
  el('settings-name').textContent   = u.name;
  el('settings-email').textContent  = u.email;
  el('settings-role').textContent   = u.role;

  const adminCard = el('admin-users-card');
  if (u.role !== 'ADMIN') {
    adminCard.style.display = 'none';
    return;
  }

  adminCard.style.display = '';
  const data = await get('/users?limit=50');
  const tbody = el('users-table-body');

  if (!data?.success) { tbody.innerHTML = `<tr><td colspan="5" class="loading-cell">Failed to load users.</td></tr>`; return; }

  tbody.innerHTML = data.data.map(user => {
    const isActive = user.status === 'ACTIVE';
    const isSelf   = user.id === currentUser.id;
    const statusToggle = isSelf ? '—' : `<button class="act-btn ${isActive ? 'del' : ''}" onclick="toggleUserStatus('${user.id}','${user.status}')">${isActive ? 'Deactivate' : 'Activate'}</button>`;
    return `<tr>
      <td style="font-weight:500">${user.name}${isSelf ? ' <span style="font-size:11px;color:var(--text-muted)">(you)</span>' : ''}</td>
      <td style="color:var(--text-secondary)">${user.email}</td>
      <td><span class="tag">${user.role}</span></td>
      <td><span class="type-tag ${isActive ? 'type-income' : 'type-expense'}">${user.status}</span></td>
      <td>${statusToggle}</td>
    </tr>`;
  }).join('');
}

async function toggleUserStatus(id, currentStatus) {
  const action = currentStatus === 'ACTIVE' ? 'deactivate' : 'ACTIVE';
  let data;
  if (action === 'deactivate') {
    data = await apiFetch(`/users/${id}/deactivate`, { method: 'PATCH' });
  } else {
    data = await patch(`/users/${id}`, { status: 'ACTIVE' });
  }
  if (data?.success) {
    toast(`User ${action === 'deactivate' ? 'deactivated' : 'activated'}`, 'success');
    loadSettings();
  } else {
    toast(data?.message || 'Action failed', 'error');
  }
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function toast(message, type = 'info') {
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const container = el('toast-container');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${icons[type]}</span><span>${message}</span>`;
  container.appendChild(t);
  setTimeout(() => {
    t.classList.add('fade-out');
    setTimeout(() => t.remove(), 300);
  }, 3000);
}

// ── Utils ─────────────────────────────────────────────────────────────────────
const el = id => document.getElementById(id);
const fmt = val => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);
const fmtDate = str => new Date(str).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
