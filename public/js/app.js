const API_BASE = '/api';

// ── DOM Elements ─────────────────────────────────────────────────────────────
const views = {
  login: document.getElementById('login-view'),
  dashboard: document.getElementById('dashboard-view')
};

const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');
const refreshBtn = document.getElementById('refresh-btn');
const periodBtns = document.querySelectorAll('.period-selector .pill-btn');

// State
let token = localStorage.getItem('zorvyn_token') || null;
let currentPeriod = 'month';

// ── Initialization ───────────────────────────────────────────────────────────
function init() {
  if (token) {
    showDashboard();
    loadDashboardData();
  } else {
    showLogin();
  }

  // Event Listeners
  loginForm.addEventListener('submit', handleLogin);
  logoutBtn.addEventListener('click', handleLogout);
  refreshBtn.addEventListener('click', loadDashboardData);
  
  periodBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      periodBtns.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      currentPeriod = e.target.dataset.period;
      loadDashboardData();
    });
  });
}

// ── Auth Logic ───────────────────────────────────────────────────────────────
async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const btn = document.getElementById('login-btn');
  
  btn.innerHTML = '<span>Authenticating...</span>';
  btn.style.opacity = '0.8';

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();

    if (data.success) {
      token = data.data.accessToken;
      localStorage.setItem('zorvyn_token', token);
      
      const user = data.data.user;
      document.getElementById('user-name').innerText = user.name;
      document.getElementById('user-role').innerText = user.role;
      document.getElementById('user-avatar').innerText = user.name.charAt(0);
      
      showDashboard();
      loadDashboardData();
    } else {
      loginError.innerText = data.message || 'Authentication failed';
    }
  } catch (err) {
    loginError.innerText = 'Network error. Core server might be down.';
  } finally {
    btn.innerHTML = '<span>Sign In</span>';
    btn.style.opacity = '1';
  }
}

function handleLogout() {
  token = null;
  localStorage.removeItem('zorvyn_token');
  showLogin();
}

function showLogin() {
  views.dashboard.classList.remove('active-view');
  views.login.classList.add('active-view');
}

function showDashboard() {
  views.login.classList.remove('active-view');
  views.dashboard.classList.add('active-view');
}

// ── Data Fetching & Rendering ────────────────────────────────────────────────
async function fetchAPI(endpoint) {
  if (!token) return null;
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (res.status === 401 || res.status === 403) {
    handleLogout(); // Token expired or invalid
    return null;
  }
  return res.json();
}

async function loadDashboardData() {
  refreshBtn.style.opacity = '0.5';
  
  const [summaryRes, categoryRes, recentRes] = await Promise.all([
    fetchAPI(`/dashboard/summary?period=${currentPeriod}`),
    fetchAPI(`/dashboard/categories?period=${currentPeriod}`),
    fetchAPI(`/dashboard/recent?limit=8`)
  ]);

  if (summaryRes && summaryRes.success) renderSummary(summaryRes.data);
  if (categoryRes && categoryRes.success) renderCategories(categoryRes.data);
  if (recentRes && recentRes.success) renderRecent(recentRes.data);
  
  refreshBtn.style.opacity = '1';
}

function renderSummary(data) {
  document.getElementById('stat-income').innerText = formatCurrency(data.totalIncome);
  document.getElementById('stat-expense').innerText = formatCurrency(data.totalExpenses);
  document.getElementById('stat-balance').innerText = formatCurrency(data.netBalance);
  document.getElementById('stat-count').innerText = data.recordCount;
}

function renderCategories(categories) {
  const container = document.getElementById('category-container');
  container.innerHTML = '';
  
  if (!categories || categories.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted);font-size:14px;">No data for this period.</p>';
    return;
  }

  // Find max net for scale
  const maxVal = Math.max(...categories.map(c => Math.abs(c.net)), 1);

  categories.forEach(cat => {
    // Only show if there's actual activity
    if(cat.income === 0 && cat.expense === 0) return;
    
    // Choose color based on net
    let isIncome = cat.net >= 0;
    let percent = Math.min((Math.abs(cat.net) / maxVal) * 100, 100);
    
    // Avoid missing bar if very small
    if (percent < 5) percent = 5;

    const el = document.createElement('div');
    el.className = 'cat-item';
    el.innerHTML = `
      <div class="cat-info">
        <span class="cat-name">${cat.category}</span>
        <div class="cat-bar-bg">
          <div class="cat-bar-fill" style="width: ${percent}%; background: ${isIncome ? 'var(--status-income)' : 'var(--status-expense)'}"></div>
        </div>
      </div>
      <div class="cat-amt ${isIncome ? 'amt-inc' : 'amt-exp'}">
        ${isIncome ? '+' : '-'}${formatCurrency(Math.abs(cat.net))}
      </div>
    `;
    container.appendChild(el);
  });
}

function renderRecent(records) {
  const tbody = document.getElementById('activity-table-body');
  tbody.innerHTML = '';

  if (!records || records.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted);">No recent activity</td></tr>`;
    return;
  }

  records.forEach(r => {
    const isIncome = r.type === 'INCOME';
    const dateStr = new Date(r.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="color:var(--text-secondary)">${dateStr}</td>
      <td style="font-weight:500;">${r.description || 'No description'}</td>
      <td><span class="tag">${r.category}</span></td>
      <td style="color:var(--text-secondary)">${r.author?.name || 'Unknown'}</td>
      <td class="${isIncome ? 'amt-inc' : 'amt-exp'}">
        ${isIncome ? '+' : '-'}${formatCurrency(r.amount)}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// ── Utils ────────────────────────────────────────────────────────────────────
function formatCurrency(val) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
}

// Boot up
document.addEventListener('DOMContentLoaded', init);
