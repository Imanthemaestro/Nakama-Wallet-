/* ============================================================
   calculator.js — Budget Calculator Logic
   ============================================================ */

const INCOME_FIELDS  = ['Salary', 'Freelance / Side Hustle', 'Investments', 'Rental Income', 'Others'];
const EXPENSE_FIELDS = ['Healthcare', 'Rent', 'Groceries', 'Transportation', 'Utilities', 'Insurance', 'Savings & Investments', 'Others'];

document.addEventListener('DOMContentLoaded', () => {
  requireAuth(); 

  initCalculator();

  document.querySelectorAll('.calc-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.calc-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const panel = btn.dataset.calc;
      document.getElementById('calc-budget-panel').classList.toggle('active', panel === 'budget');
      document.getElementById('calc-budget-panel').classList.toggle('hidden', panel !== 'budget');
      document.getElementById('calc-tx-panel').classList.toggle('active', panel === 'transactions');
      document.getElementById('calc-tx-panel').classList.toggle('hidden', panel !== 'transactions');
      if (panel === 'transactions') renderCalcTxList();
    });
  });

  document.getElementById('save-budget-btn')?.addEventListener('click', saveBudget);
});

function initCalculator() {
  buildBudgetRows();
  initCalcYear();
  renderCalcTxList();
  updateBudgetSummary();
}

function buildBudgetRows() {
  const incomeContainer  = document.getElementById('income-rows');
  const expenseContainer = document.getElementById('expense-rows');
  if (!incomeContainer) return;

  incomeContainer.innerHTML = INCOME_FIELDS.map(f => budgetRowHTML(f, 'income')).join('');
  expenseContainer.innerHTML = EXPENSE_FIELDS.map(f => budgetRowHTML(f, 'expense')).join('');

  incomeContainer.querySelectorAll('input, select').forEach(el => el.addEventListener('input', updateBudgetSummary));
  expenseContainer.querySelectorAll('input, select').forEach(el => el.addEventListener('input', updateBudgetSummary));
}

function budgetRowHTML(label, section) {
  const id = `${section}_${label.replace(/[^a-z0-9]/gi,'_').toLowerCase()}`;
  return `
    <div class="budget-row">
      <span class="budget-row-label">${label}</span>
      <select class="budget-row-currency" id="${id}_curr">
        <option value="NGN">₦ NGN</option>
        <option value="USD">$ USD</option>
        <option value="GBP">£ GBP</option>
      </select>
      <input type="text" class="budget-row-input" id="${id}_val" placeholder="0.00" inputmode="decimal" />
    </div>
  `;
}

function initCalcYear() {
  const sel = document.getElementById('calc-year');
  if (!sel) return;
  const currentYear = new Date().getFullYear();
  sel.innerHTML = '';
  for (let y = currentYear - 2; y <= currentYear + 2; y++) {
    const opt = document.createElement('option');
    opt.value = y; opt.textContent = y;
    if (y === currentYear) opt.selected = true;
    sel.appendChild(opt);
  }
  sel.addEventListener('change', updateBudgetSummary);
  document.getElementById('calc-month').addEventListener('change', updateBudgetSummary);
  document.getElementById('calc-summary-currency')?.addEventListener('change', updateBudgetSummary);
}

function getCalcPeriod() {
  const month = document.getElementById('calc-month')?.value || 'May';
  const year  = document.getElementById('calc-year')?.value  || new Date().getFullYear();
  return { month, year };
}

function getCalcTotals() {
  let totalIncome = 0, totalExpense = 0;
  const incomeDetails = [], expenseDetails = [];

  INCOME_FIELDS.forEach(label => {
    const id  = `income_${label.replace(/[^a-z0-9]/gi,'_').toLowerCase()}`;
    const val = parseFloat(document.getElementById(`${id}_val`)?.value) || 0;
    const cur = document.getElementById(`${id}_curr`)?.value || 'NGN';
    const ngn = toNGN(val, cur);
    totalIncome += ngn;
    if (val > 0) incomeDetails.push({ label, val, cur, ngn });
  });

  EXPENSE_FIELDS.forEach(label => {
    const id  = `expense_${label.replace(/[^a-z0-9]/gi,'_').toLowerCase()}`;
    const val = parseFloat(document.getElementById(`${id}_val`)?.value) || 0;
    const cur = document.getElementById(`${id}_curr`)?.value || 'NGN';
    const ngn = toNGN(val, cur);
    totalExpense += ngn;
    if (val > 0) expenseDetails.push({ label, val, cur, ngn });
  });

  return { totalIncome, totalExpense, incomeDetails, expenseDetails };
}

function updateBudgetSummary() {
  const { totalIncome, totalExpense } = getCalcTotals();
  const surplus = totalIncome - totalExpense;
  const summCurr = document.getElementById('calc-summary-currency')?.value || globalCurrency;
  const sym = CURRENCY_SYMBOLS[summCurr];

  document.getElementById('sum-income').textContent   = `${sym} ${numberWithCommas(fromNGN(totalIncome, summCurr).toFixed(2))}`;
  document.getElementById('sum-expenses').textContent = `${sym} ${numberWithCommas(fromNGN(totalExpense, summCurr).toFixed(2))}`;

  const surplusEl    = document.getElementById('sum-surplus');
  const surplusRow   = document.getElementById('surplus-row');
  const surplusLabel = document.getElementById('surplus-label');
  const summaryMsg   = document.getElementById('summary-msg');
  const displaySurplus = fromNGN(Math.abs(surplus), summCurr).toFixed(2);

  if (surplus >= 0) {
    surplusEl.textContent = `+ ${sym} ${numberWithCommas(displaySurplus)}`;
    surplusRow.classList.remove('deficit');
    surplusLabel.textContent = '🟢 Surplus';
    summaryMsg.textContent = totalIncome === 0 ? '💡 Fill in your income and expenses above to see your budget summary.' : surplus > totalIncome * 0.2 ? '🌟 Excellent savings discipline this month!' : '👍 Good job — you\'re staying within budget.';
  } else {
    surplusEl.textContent = `- ${sym} ${numberWithCommas(displaySurplus)}`;
    surplusRow.classList.add('deficit');
    surplusLabel.textContent = '🔴 Deficit';
    summaryMsg.textContent = '⚠️ Warning: your expenses exceed your income this month.';
  }
}

function saveBudget() {
  const { incomeDetails, expenseDetails } = getCalcTotals();
  if (incomeDetails.length === 0 && expenseDetails.length === 0) {
    showToast('Nothing to save. Fill in some amounts first.', 'error'); return;
  }

  const { month, year } = getCalcPeriod();
  const period = `${month} ${year}`;
  const txs = getTransactions();
  const filtered = txs.filter(t => !t.isBudgetEntry || !t.period || t.period !== period);

  const newTxs = [];
  incomeDetails.forEach(d => {
    newTxs.push({ id: uid(), type: 'income', name: `${d.label} (${period})`, category: d.label, amount: d.val, currency: d.cur, amountNGN: d.ngn, date: `${year}-${String(MONTHS.indexOf(month)+1).padStart(2,'0')}-01`, notes: `Budget entry for ${period}`, isBudgetEntry: true, period, createdAt: Date.now() });
  });
  expenseDetails.forEach(d => {
    newTxs.push({ id: uid(), type: 'expense', name: `${d.label} (${period})`, category: d.label, amount: d.val, currency: d.cur, amountNGN: d.ngn, date: `${year}-${String(MONTHS.indexOf(month)+1).padStart(2,'0')}-01`, notes: `Budget entry for ${period}`, isBudgetEntry: true, period, createdAt: Date.now() });
  });

  saveTransactions([...filtered, ...newTxs]);
  showToast(`Budget saved successfully for ${period}! 🎉`);

  [...INCOME_FIELDS, ...EXPENSE_FIELDS].forEach(label => {
    const section = INCOME_FIELDS.includes(label) ? 'income' : 'expense';
    const id = `${section}_${label.replace(/[^a-z0-9]/gi,'_').toLowerCase()}`;
    if (document.getElementById(`${id}_val`)) document.getElementById(`${id}_val`).value = '';
  });

  updateBudgetSummary();
  renderCalcTxList();
}

function renderCalcTxList() {
  const txs = getTransactions();
  const search = (document.getElementById('tx-search-calc')?.value || '').toLowerCase();
  const type   = document.getElementById('tx-filter-type-calc')?.value || 'all';

  const filtered = txs.filter(tx => {
    if (type !== 'all' && tx.type !== type) return false;
    if (search && !tx.name.toLowerCase().includes(search)) return false;
    return true;
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  const list = document.getElementById('tx-list-calc');
  if (!list) return;

  if (filtered.length === 0) { list.innerHTML = `<div class="empty-state">No transactions yet.</div>`; return; }
  list.innerHTML = filtered.map(tx => txItemHTML(tx)).join('');
}

function txItemHTML(tx) {
  const icon = CATEGORY_ICONS[tx.category] || (tx.type === 'income' ? '💚' : '🔴');
  const sign = tx.type === 'income' ? '+' : '-';
  const dateStr = formatDate(tx.date);
  return `<div class="tx-item">
            <div class="tx-icon ${tx.type}">${icon}</div>
            <div class="tx-info"><div class="tx-name">${escapeHTML(tx.name)}</div><div class="tx-meta">${tx.category} · ${dateStr}</div></div>
            <div class="tx-right"><div class="tx-amount ${tx.type}">${sign}${formatCurrency(tx.amountNGN, globalCurrency)}</div></div>
          </div>`;
}

['tx-search-calc','tx-filter-type-calc'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('input', renderCalcTxList);
});