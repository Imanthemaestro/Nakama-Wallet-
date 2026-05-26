/* ============================================================
   home.js — Dashboard Logic
   Dave's logic + Iman's doughnut chart design
   ============================================================ */
'use strict';

let pieChartInstance = null;
const txModal = document.getElementById('tx-modal');

document.addEventListener('DOMContentLoaded', () => {
  requireAuth();

  /* Currency selector */
  const currSelect = document.getElementById('global-currency');
  if (currSelect) {
    currSelect.value = globalCurrency;
    currSelect.addEventListener('change', function () {
      globalCurrency = this.value;
      saveUserPrefs({ ...getUserPrefs(), currency: globalCurrency });
      refreshAll();
    });
  }

  /* Default date */
  const dateInput = document.getElementById('tx-date');
  if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

  /* Modal */
  document.getElementById('open-tx-modal')?.addEventListener('click', () => openTxModal());
  document.getElementById('close-tx-modal')?.addEventListener('click', closeTxModal);
  txModal?.addEventListener('click', e => { if (e.target === txModal) closeTxModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeTxModal(); });

  initTxForm();

  /* Filters */
  ['tx-search','tx-filter-type','tx-filter-cat','tx-filter-month'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', renderTransactionList);
  });

  /* Goals */
  document.getElementById('set-goal-btn')?.addEventListener('click', handleSetGoal);
  document.getElementById('goals-list')?.addEventListener('click', handleDeleteGoal);

  refreshAll();
});

/* ── Refresh All ── */
function refreshAll() {
  updateStatCards();
  renderTransactionList();
  renderChart();
  renderGoals();
}

/* ── Stat Cards ── */
function updateStatCards() {
  const txs      = getTransactions();
  const goals    = getGoals();
  const totalIncome  = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amountNGN, 0);
  const totalExpense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amountNGN, 0);
  const totalBudgeted = goals.reduce((s, g) => s + g.amountNGN, 0);
  const budgetBase = totalBudgeted || totalIncome;
  const remaining  = budgetBase - totalExpense;

  document.getElementById('stat-budgeted').textContent  = formatCurrency(budgetBase, globalCurrency);
  document.getElementById('stat-spent').textContent     = formatCurrency(totalExpense, globalCurrency);
  const remEl = document.getElementById('stat-remaining');
  remEl.textContent = (remaining < 0 ? '-' : '') + formatCurrency(Math.abs(remaining), globalCurrency);
  remEl.style.color = remaining < 0 ? 'var(--red)' : '';
}

/* ── Iman's Doughnut Chart ── */
function renderChart() {
  const txs      = getTransactions();
  const canvas   = document.getElementById('pie-chart');
  const emptyEl  = document.getElementById('chart-empty');
  const centerEl = document.getElementById('chart-center');
  if (!canvas) return;

  const totalIncome  = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amountNGN, 0);
  const totalExpense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amountNGN, 0);
  const goals        = getGoals();
  const budgetBase   = goals.reduce((s, g) => s + g.amountNGN, 0) || totalIncome;
  const remaining    = Math.max(budgetBase - totalExpense, 0);

  /* Update center label */
  const centerAmount = document.getElementById('center-amount');
  if (centerAmount) centerAmount.textContent = formatCurrency(remaining, globalCurrency);

  if (txs.length === 0) {
    canvas.style.display = 'none';
    centerEl?.classList.add('hidden');
    emptyEl?.classList.remove('hidden');
    if (pieChartInstance) { pieChartInstance.destroy(); pieChartInstance = null; }
    return;
  }

  canvas.style.display = 'block';
  emptyEl?.classList.add('hidden');
  centerEl?.classList.remove('hidden');

  const data   = budgetBase > 0 ? [remaining, totalExpense] : [0, 0, 100];
  const labels = ['Remaining', 'Spent'];

  if (pieChartInstance) pieChartInstance.destroy();

  pieChartInstance = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: data.map(v => parseFloat(fromNGN(v, globalCurrency).toFixed(2))),
        backgroundColor: ['#2BB31C', '#EB3636'],
        borderWidth: 0,
        hoverOffset: 6
      }]
    },
    options: {
      cutout: '72%',
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.label}: ${formatCurrency(
              ctx.dataIndex === 0 ? remaining : totalExpense,
              globalCurrency
            )}`
          }
        }
      },
      animation: { animateRotate: true, duration: 700 }
    }
  });
}

/* ── Transaction Modal ── */
function openTxModal(editId = null) {
  document.getElementById('tx-edit-id').value = editId || '';
  document.getElementById('modal-title').textContent     = editId ? 'Edit Transaction' : 'Add Transaction';
  document.getElementById('tx-submit-btn').textContent   = editId ? 'Update Transaction' : 'Save Transaction';
  clearMsg('tx-msg');

  if (editId) {
    const tx = getTransactions().find(t => t.id === editId);
    if (tx) {
      setTxType(tx.type);
      document.getElementById('tx-name').value     = tx.name;
      document.getElementById('tx-category').value = tx.category;
      document.getElementById('tx-amount').value   = fromNGN(tx.amountNGN, tx.currency).toFixed(2);
      document.getElementById('tx-currency').value = tx.currency;
      document.getElementById('tx-date').value     = tx.date;
      document.getElementById('tx-notes').value    = tx.notes || '';
    }
  } else {
    document.getElementById('tx-form').reset();
    document.getElementById('tx-date').value = new Date().toISOString().split('T')[0];
    setTxType('income');
  }

  txModal.classList.remove('hidden');
  document.getElementById('tx-name').focus();
}

function closeTxModal() {
  txModal.classList.add('hidden');
  document.getElementById('tx-form').reset();
  clearMsg('tx-msg');
}

function initTxForm() {
  document.querySelectorAll('.tx-type-tab').forEach(btn => {
    btn.addEventListener('click', () => setTxType(btn.dataset.type));
  });

  document.getElementById('tx-amount')?.addEventListener('input', function () {
    let v = this.value.replace(/[^0-9.]/g, '');
    const parts = v.split('.');
    if (parts.length > 2) v = parts[0] + '.' + parts.slice(1).join('');
    if (v.length > 1 && v[0] === '0' && v[1] !== '.') v = v.replace(/^0+/, '');
    this.value = v;
  });

  document.getElementById('tx-form')?.addEventListener('submit', function (e) {
    e.preventDefault();
    clearErrors(['tx-name-err', 'tx-amount-err']);
    clearMsg('tx-msg');

    const type     = document.querySelector('.tx-type-tab.active')?.dataset.type || 'income';
    const name     = document.getElementById('tx-name').value.trim();
    const category = document.getElementById('tx-category').value;
    const amount   = parseFloat(document.getElementById('tx-amount').value);
    const currency = document.getElementById('tx-currency').value;
    const date     = document.getElementById('tx-date').value;
    const notes    = document.getElementById('tx-notes').value.trim();
    const editId   = document.getElementById('tx-edit-id').value;

    let valid = true;
    if (!name)                 { setError('tx-name-err', 'Transaction name is required'); valid = false; }
    if (!amount || amount <= 0){ setError('tx-amount-err', 'Enter a valid amount'); valid = false; }
    if (!valid) return;

    const amountNGN = toNGN(amount, currency);
    const txs = getTransactions();

    if (editId) {
      const idx = txs.findIndex(t => t.id === editId);
      if (idx !== -1) {
        txs[idx] = { ...txs[idx], type, name, category, amount, currency, amountNGN, date, notes };
        showToast('Transaction updated! ✅');
      }
    } else {
      txs.push({ id: uid(), type, name, category, amount, currency, amountNGN, date, notes, createdAt: Date.now() });
      showToast('Transaction saved! 🎉');
    }

    saveTransactions(txs);
    closeTxModal();
    refreshAll();
  });
}

function setTxType(type) {
  document.querySelectorAll('.tx-type-tab').forEach(t => t.classList.toggle('active', t.dataset.type === type));
  const select = document.getElementById('tx-category');
  const cats = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  select.innerHTML = cats.map(c => `<option value="${c}">${c}</option>`).join('');
}

/* ── Transaction List ── */
function renderTransactionList() {
  const txs    = getTransactions();
  const search = (document.getElementById('tx-search')?.value || '').toLowerCase();
  const type   = document.getElementById('tx-filter-type')?.value || 'all';
  const cat    = document.getElementById('tx-filter-cat')?.value || 'all';
  const month  = document.getElementById('tx-filter-month')?.value || 'all';

  populateTxFilterOptions(txs);

  const filtered = txs.filter(tx => {
    if (type !== 'all' && tx.type !== type) return false;
    if (cat  !== 'all' && tx.category !== cat) return false;
    if (month !== 'all' && !tx.date.startsWith(month)) return false;
    if (search && !tx.name.toLowerCase().includes(search) && !tx.category.toLowerCase().includes(search)) return false;
    return true;
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  const list = document.getElementById('tx-list');
  if (!list) return;

  if (filtered.length === 0) {
    list.innerHTML = `<div class="empty-state">${txs.length === 0
      ? 'No transactions yet. Click "+ Add" to get started.'
      : 'No transactions match your filters.'}</div>`;
    return;
  }
  list.innerHTML = filtered.map(tx => txItemHTML(tx)).join('');
}

function populateTxFilterOptions(txs) {
  const catSel   = document.getElementById('tx-filter-cat');
  const monthSel = document.getElementById('tx-filter-month');
  if (!catSel || !monthSel) return;

  const cats   = [...new Set(txs.map(t => t.category))];
  const months = [...new Set(txs.map(t => t.date.slice(0,7)))].sort().reverse();

  const prevCat = catSel.value;
  catSel.innerHTML = `<option value="all">All Categories</option>` + cats.map(c => `<option value="${c}">${c}</option>`).join('');
  if (cats.includes(prevCat)) catSel.value = prevCat;

  const prevMonth = monthSel.value;
  monthSel.innerHTML = `<option value="all">All Months</option>` + months.map(m => {
    const [y, mo] = m.split('-');
    return `<option value="${m}">${MONTHS[parseInt(mo)-1]} ${y}</option>`;
  }).join('');
  if (months.includes(prevMonth)) monthSel.value = prevMonth;
}

function txItemHTML(tx) {
  const icon  = CATEGORY_ICONS[tx.category] || (tx.type === 'income' ? '💚' : '🔴');
  const sign  = tx.type === 'income' ? '+' : '-';
  return `
    <div class="tx-item" data-id="${tx.id}">
      <div class="tx-icon ${tx.type}">${icon}</div>
      <div class="tx-info">
        <div class="tx-name">${escapeHTML(tx.name)}</div>
        <div class="tx-meta">${tx.category} · ${formatDate(tx.date)}</div>
      </div>
      <div class="tx-right">
        <div class="tx-amount ${tx.type}">${sign}${formatCurrency(tx.amountNGN, globalCurrency)}</div>
        <div class="tx-actions">
          <button class="btn-icon edit" data-action="edit"   data-id="${tx.id}" title="Edit">✏️</button>
          <button class="btn-icon del"  data-action="delete" data-id="${tx.id}" title="Delete">🗑️</button>
        </div>
      </div>
    </div>`;
}

document.getElementById('tx-list')?.addEventListener('click', e => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const id = btn.dataset.id;
  if (btn.dataset.action === 'delete') {
    if (!confirm('Delete this transaction?')) return;
    saveTransactions(getTransactions().filter(t => t.id !== id));
    showToast('Transaction deleted.', 'warning');
    refreshAll();
  }
  if (btn.dataset.action === 'edit') openTxModal(id);
});

/* ── Budget Goals ── */
function handleSetGoal() {
  const category  = document.getElementById('goal-category').value;
  const currency  = document.getElementById('goal-currency').value;
  const amountRaw = parseFloat(document.getElementById('goal-amount').value);
  if (!amountRaw || amountRaw <= 0) { showToast('Enter a valid goal amount.', 'error'); return; }

  const amountNGN = toNGN(amountRaw, currency);
  const goals = getGoals();
  const existing = goals.findIndex(g => g.category === category);
  if (existing !== -1) { goals[existing] = { ...goals[existing], amountNGN, amount: amountRaw, currency }; }
  else { goals.push({ id: uid(), category, amountNGN, amount: amountRaw, currency }); }

  saveGoals(goals);
  document.getElementById('goal-amount').value = '';
  showToast(`Goal set for ${category}! 🎯`);
  refreshAll();
}

function renderGoals() {
  const goals = getGoals();
  const txs   = getTransactions();
  const list  = document.getElementById('goals-list');
  if (!list) return;

  if (goals.length === 0) {
    list.innerHTML = '<div class="empty-state" style="padding:12px 0">No goals yet. Set one above!</div>';
    return;
  }

  list.innerHTML = goals.map(goal => {
    const spent     = txs.filter(t => t.type === 'expense' && t.category === goal.category).reduce((s, t) => s + t.amountNGN, 0);
    const budgeted  = goal.amountNGN;
    const remaining = budgeted - spent;
    const pct       = budgeted > 0 ? Math.min((spent / budgeted) * 100, 100) : 0;
    const over      = spent > budgeted;
    const remDisplay = (remaining < 0 ? '-' : '') + formatCurrency(Math.abs(remaining), globalCurrency);

    return `
      <div class="goal-item">
        <div class="goal-head">
          <span class="goal-name">${CATEGORY_ICONS[goal.category] || '🎯'} ${goal.category}</span>
          <button class="goal-del" data-goal-id="${goal.id}">✕ Remove</button>
        </div>
        <div class="goal-progress-track">
          <div class="goal-progress-fill ${over ? 'over' : ''}" style="width:${pct}%"></div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div class="goal-amounts">
            Spent: ${formatCurrency(spent, globalCurrency)} / Budget: ${formatCurrency(budgeted, globalCurrency)}
            · Remaining: <strong style="color:${over ? 'var(--red)' : 'var(--green3)'}">${remDisplay}</strong>
          </div>
          <div class="goal-pct ${over ? 'over' : ''}">${pct.toFixed(0)}%</div>
        </div>
      </div>`;
  }).join('');
}

function handleDeleteGoal(e) {
  const btn = e.target.closest('[data-goal-id]');
  if (!btn) return;
  saveGoals(getGoals().filter(g => g.id !== btn.dataset.goalId));
  showToast('Goal removed.', 'warning');
  refreshAll();
}