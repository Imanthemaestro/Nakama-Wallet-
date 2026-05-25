'use strict';

// ── STATE ──
let transactions = [];
let editingIndex = null;

// ── CURRENCY HELPERS ──
// These were called in the original file but never defined anywhere — that JS crash
// broke the entire page including the modal and Save Budget button.
function getSavedCurrency() {
    try { return localStorage.getItem('wn_tx_currency') || 'USD'; } catch { return 'USD'; }
}
function saveCurrency(val) {
    try { localStorage.setItem('wn_tx_currency', val); } catch {}
}
function getCurrencySymbol() {
    const symbols = { USD: '$', EUR: '€', GBP: '£', NGN: '₦' };
    return symbols[getSavedCurrency()] || '$';
}

// ── CURRENCY SELECTOR ──
function initCurrencySelector() {
    const sel = document.getElementById('currency-select-transactions');
    if (!sel) return;
    sel.value = getSavedCurrency();
    sel.addEventListener('change', () => {
        saveCurrency(sel.value);
        render();
    });
}

// ── LOAD & PERSIST via shared.js storage ──
function loadTransactions() {
    // getTransactions() from shared.js reads from the current user's localStorage key
    const stored = getTransactions();
    transactions = stored.map(tx => ({
        id:     tx.id,
        name:   tx.name,
        amount: tx.amount,
        type:   tx.type,
        date:   tx.date,
        createdAt: tx.createdAt
    }));
}

function persistTransactions() {
    const currency = getSavedCurrency();
    const rate = RATES_TO_NGN[currency] || 1;
    const shaped = transactions.map(tx => ({
        id:        tx.id || uid(),
        type:      tx.type,
        name:      tx.name,
        amount:    tx.amount,
        currency:  currency,
        amountNGN: tx.amount * rate,
        date:      tx.date,
        category:  'Others',
        createdAt: tx.createdAt || Date.now()
    }));
    saveTransactions(shaped);
}

// ── MODAL ──
function openModal(index = null) {
    editingIndex = index;

    if (index !== null) {
        const tx = transactions[index];
        document.getElementById('input-name').value   = tx.name;
        document.getElementById('input-amount').value = tx.amount;
        document.getElementById('input-type').value   = tx.type;
        document.getElementById('input-date').value   = tx.date;
        document.querySelector('.modal-title').textContent = 'Edit Transaction';
    } else {
        document.getElementById('input-name').value   = '';
        document.getElementById('input-amount').value = '';
        document.getElementById('input-type').value   = 'income';
        document.getElementById('input-date').value   = todayStr();
        document.querySelector('.modal-title').textContent = 'Add Transaction';
    }

    document.getElementById('modal').classList.add('open');
    document.getElementById('modal-overlay').classList.add('open');
}

function closeModal() {
    document.getElementById('modal').classList.remove('open');
    document.getElementById('modal-overlay').classList.remove('open');
    editingIndex = null;
}

// ── ADD / EDIT ──
function addTransaction() {
    const name   = document.getElementById('input-name').value.trim();
    const amount = parseFloat(document.getElementById('input-amount').value);
    const type   = document.getElementById('input-type').value;
    const date   = document.getElementById('input-date').value;

    if (!name || isNaN(amount) || amount <= 0 || !date) {
        alert('Please fill in all fields with valid values.');
        return;
    }

    const tx = { id: uid(), name, amount, type, date, createdAt: Date.now() };

    if (editingIndex !== null) {
        transactions[editingIndex] = tx;
    } else {
        transactions.push(tx);
    }

    persistTransactions();
    closeModal();
    render();
}

// ── DELETE ──
function deleteTransaction(index) {
    if (confirm('Delete this transaction?')) {
        transactions.splice(index, 1);
        persistTransactions();
        render();
    }
}

// ── SAVE BUDGET (the summary card button) ──
// Persists current transactions and shows confirmation.
function saveBudget() {
    if (transactions.length === 0) {
        alert('No transactions to save yet. Add some transactions first.');
        return;
    }
    persistTransactions();
    // showToast isn't available here (no toast container on this page),
    // so use a simple visual confirmation via the message element.
    const msgEl = document.getElementById('message-text');
    if (msgEl) {
        const prev = msgEl.textContent;
        msgEl.textContent = '✅ Budget saved!';
        setTimeout(() => { msgEl.textContent = prev; }, 2500);
    }
}

// ── RENDER ──
function render() {
    const isEmpty = transactions.length === 0;
    document.getElementById('empty-state').style.display  = isEmpty ? 'block' : 'none';
    document.getElementById('filled-state').style.display = isEmpty ? 'none'  : 'block';
    if (!isEmpty) {
        renderList();
        renderSummary();
    }
}

function renderList() {
    const sym  = getCurrencySymbol();
    const list = document.getElementById('transaction-list');
    list.innerHTML = '';

    transactions.forEach((tx, i) => {
        const sign   = tx.type === 'income' ? '+' : '-';
        const cls    = tx.type === 'income' ? 'income' : 'expense';
        const padNum = String(i + 1).padStart(2, '0');

        const row = document.createElement('div');
        row.className = 'transaction-item';
        row.innerHTML = `
            <span class="tx-num">${padNum}</span>
            <span class="tx-name">${tx.name}</span>
            <span class="tx-date">${fmtDate(tx.date)}</span>
            <span class="tx-amount ${cls}">${sign} ${sym} ${tx.amount.toLocaleString()}</span>
            <button class="tx-edit"   onclick="openModal(${i})" title="Edit">✏️</button>
            <button class="tx-delete" onclick="deleteTransaction(${i})" title="Delete">🗑️</button>
        `;
        list.appendChild(row);
    });
}

function renderSummary() {
    const sym      = getCurrencySymbol();
    const income   = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const net      = income - expenses;
    const deficit  = net < 0 ? Math.abs(net) : 0;
    const surplus  = net >= 0 ? net : 0;

    document.getElementById('total-income').textContent   = `${sym} ${income.toLocaleString()}`;
    document.getElementById('total-expenses').textContent = `${sym} ${expenses.toLocaleString()}`;
    document.getElementById('deficit-value').textContent  = `-${sym} ${deficit.toLocaleString()}`;
    document.getElementById('surplus-value').textContent  = `+${sym} ${surplus.toLocaleString()}`;

    document.getElementById('deficit-row').style.opacity = deficit > 0 ? '1' : '0.4';
    document.getElementById('surplus-row').style.opacity = surplus > 0 ? '1' : '0.4';

    let msg = '';
    if (surplus > 0)      msg = `🎉 Great job! You have a surplus of ${sym}${surplus.toLocaleString()}.`;
    else if (deficit > 0) msg = `⚠️ You're over budget by ${sym}${deficit.toLocaleString()}. Time to cut back!`;
    else                  msg = `✅ Perfectly balanced — income matches expenses.`;
    document.getElementById('message-text').textContent = msg;
}

// ── HELPERS ──
function todayStr() { return new Date().toISOString().split('T')[0]; }
function fmtDate(dateStr) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
}

// ── INIT ──
window.addEventListener('DOMContentLoaded', () => {
    requireAuth();          // shared.js — redirects to auth.html if not logged in
    loadTransactions();     // pull from shared localStorage key
    initCurrencySelector();
    render();
});