/* ============================================================
   shared.js — Global Config, Auth Guard, and Storage
   ============================================================ */
'use strict';

const RATES_TO_NGN = { NGN: 1, USD: 1600, GBP: 2050 };
const CURRENCY_SYMBOLS = { NGN: '₦', USD: '$', GBP: '£' };

const INCOME_CATEGORIES = ['Salary', 'Freelance / Side Hustle', 'Investments', 'Rental Income', 'Others'];
const EXPENSE_CATEGORIES = ['Rent', 'Groceries', 'Healthcare', 'Transportation', 'Utilities', 'Insurance', 'Savings & Investments', 'Others'];

const CATEGORY_ICONS = {
  'Salary': '💼', 'Freelance / Side Hustle': '💻', 'Investments': '📈', 'Rental Income': '🏠', 'Others': '📦',
  'Rent': '🏠', 'Groceries': '🛒', 'Healthcare': '🏥', 'Transportation': '🚗', 'Utilities': '💡', 'Insurance': '🛡️', 'Savings & Investments': '🏦'
};

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

let currentUser = null;
let globalCurrency = 'NGN';

/* ---- Storage Helpers ---- */
function storageKey(suffix) { return `wn_${currentUser.email}_${suffix}`; }
function getTransactions() { try { return JSON.parse(localStorage.getItem(storageKey('transactions'))) || []; } catch { return []; } }
function saveTransactions(txs) { localStorage.setItem(storageKey('transactions'), JSON.stringify(txs)); }
function getGoals() { try { return JSON.parse(localStorage.getItem(storageKey('goals'))) || []; } catch { return []; } }
function saveGoals(goals) { localStorage.setItem(storageKey('goals'), JSON.stringify(goals)); }
function getUsers() { try { return JSON.parse(localStorage.getItem('wn_users')) || []; } catch { return []; } }
function saveUsers(users) { localStorage.setItem('wn_users', JSON.stringify(users)); }
function getUserPrefs() { try { return JSON.parse(localStorage.getItem(storageKey('prefs'))) || {}; } catch { return {}; } }
function saveUserPrefs(prefs) { localStorage.setItem(storageKey('prefs'), JSON.stringify(prefs)); }

/* ---- Currency Helpers ---- */
function toNGN(amount, currency) { return parseFloat(amount) * RATES_TO_NGN[currency]; }
function fromNGN(amountNGN, currency) { return amountNGN / RATES_TO_NGN[currency]; }
function formatCurrency(amountNGN, displayCurrency) {
  const converted = fromNGN(amountNGN, displayCurrency);
  return `${CURRENCY_SYMBOLS[displayCurrency]}${numberWithCommas(converted.toFixed(2))}`;
}
function numberWithCommas(x) {
  const parts = x.toString().split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
}

/* ---- Security & Global UI ---- */
function requireAuth() {
  const savedEmail = localStorage.getItem('wn_current_user');
  if (!savedEmail) { window.location.href = 'auth.html'; return; }
  
  const users = getUsers();
  currentUser = users.find(u => u.email === savedEmail);
  if (!currentUser) { window.location.href = 'auth.html'; return; }

  const prefs = getUserPrefs();
  globalCurrency = prefs.currency || 'NGN';

  const navName = document.getElementById('nav-username');
  if(navName) navName.textContent = currentUser.firstName;
}

function logoutUser() {
  localStorage.removeItem('wn_current_user');
  window.location.href = 'auth.html';
}

function showToast(message, type = 'success', duration = 3500) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastOut .3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/* ---- Utility Functions ---- */
function isValidEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }
function hashish(str) { let hash = 0; for (let i = 0; i < str.length; i++) { hash = ((hash << 5) - hash) + str.charCodeAt(i); hash |= 0; } return hash.toString(36); }
function setError(id, msg) { const el = document.getElementById(id); if (el) el.textContent = msg; }
function clearErrors(ids) { ids.forEach(id => { const el = document.getElementById(id); if (el) el.textContent = ''; }); }
function setMsg(id, msg, type = 'error') { const el = document.getElementById(id); if (!el) return; el.textContent = msg; el.className = `form-msg ${type === 'success' ? 'success' : ''}`; }
function clearMsg(id) { const el = document.getElementById(id); if (el) { el.textContent = ''; el.className = 'form-msg'; } }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }
function escapeHTML(str) { return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function formatDate(dateStr) { if (!dateStr) return ''; const d = new Date(dateStr + 'T00:00:00'); return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }

/* ---- Global Event Listeners ---- */
document.addEventListener('DOMContentLoaded', () => {
  const signoutBtn = document.getElementById('signout-btn');
  if(signoutBtn) signoutBtn.addEventListener('click', logoutUser);

  const hamburger = document.getElementById('hamburger');
  if(hamburger) hamburger.addEventListener('click', () => {
    document.getElementById('nav-links').classList.toggle('open');
  });
});