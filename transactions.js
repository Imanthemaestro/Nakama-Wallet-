// ── CURRENCY ──
const CURRENCIES = { 'USD': '$', 'EUR': '€', 'GBP': '£', 'NGN': '₦' };

function getSavedCurrency() {
    return localStorage.getItem('wn_currency') || 'USD';
}

function getCurrencySymbol() {
    return CURRENCIES[getSavedCurrency()] || '$';
}

function saveCurrency(code) {
    localStorage.setItem('wn_currency', code);
}

// ── STATE ──
let transactions = [];
let editingIndex = null;

// ── CURRENCY SELECTOR ──
function initCurrencySelector() {
    const sel = document.getElementById('currency-select-transactions');
    if (!sel) return;
    sel.value = getSavedCurrency();
    sel.addEventListener('change', () => {
        saveCurrency(sel.value);
        render(); // re-render everything with new symbol
    });
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
        document.getElementById('input-date').value   = today();
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

// ── ADD / EDIT TRANSACTION ──
function addTransaction() {
    const name   = document.getElementById('input-name').value.trim();
    const amount = parseFloat(document.getElementById('input-amount').value);
    const type   = document.getElementById('input-type').value;
    const date   = document.getElementById('input-date').value;

    if (!name || isNaN(amount) || amount <= 0 || !date) {
        alert('Please fill in all fields with valid values.');
        return;
    }

    const tx = { name, amount, type, date };

    if (editingIndex !== null) {
        transactions[editingIndex] = tx;
    } else {
        transactions.push(tx);
    }

    closeModal();
    render();
}

// ── DELETE ──
function deleteTransaction(index) {
    if (confirm('Delete this transaction?')) {
        transactions.splice(index, 1);
        render();
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
        const sign    = tx.type === 'income' ? '+' : '-';
        const cls     = tx.type === 'income' ? 'income' : 'expense';
        const padNum  = String(i + 1).padStart(2, '0');
        const fmtDate = formatDate(tx.date);

        const row = document.createElement('div');
        row.className = 'transaction-item';
        row.innerHTML = `
            <span class="tx-num">${padNum}</span>
            <span class="tx-name">${tx.name}</span>
            <span class="tx-date">${fmtDate}</span>
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

    // Dynamic message
    let msg = '';
    if (surplus > 0) {
        msg = `🎉 Great job! You have a surplus of ${sym}${surplus.toLocaleString()}.`;
    } else if (deficit > 0) {
        msg = `⚠️ You're over budget by ${sym}${deficit.toLocaleString()}. Time to cut back!`;
    } else if (transactions.length > 0) {
        msg = `✅ Perfectly balanced — income matches expenses.`;
    } else {
        msg = `Message: You either did good or….`;
    }
    document.getElementById('message-text').textContent = msg;
}

// ── HELPERS ──
function today() {
    return new Date().toISOString().split('T')[0];
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
}

// ── INIT ──
window.addEventListener('DOMContentLoaded', () => {
    initCurrencySelector();
    render();
});