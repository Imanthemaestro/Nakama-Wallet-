// ── CURRENCY ──
const CURRENCIES = {
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'NGN': '₦'
};

function getSavedCurrency() {
    return localStorage.getItem('wn_currency') || 'USD';
}

function getCurrencySymbol() {
    return CURRENCIES[getSavedCurrency()] || '$';
}

function saveCurrency(code) {
    localStorage.setItem('wn_currency', code);
}

// ── CHART SETUP ──
const ctx = document.getElementById('budgetChart').getContext('2d');
const budgetChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
        labels: ['Remaining', 'Spent', 'Unallocated'],
        datasets: [{
            data: [0, 0, 100],
            backgroundColor: ['#2BB31C', '#EB3636', '#D9D9D9'],
            borderWidth: 0,
            hoverOffset: 6
        }]
    },
    options: {
        cutout: '72%',
        plugins: {
            legend: { display: false },
            tooltip: { enabled: true }
        },
        animation: { animateRotate: true, duration: 800 }
    }
});

// ── UPDATE DASHBOARD ──
function updateDashboard(budgeted, spent) {
    const remaining = Math.max(budgeted - spent, 0);
    const sym = getCurrencySymbol();

    document.getElementById('total-budgeted').textContent = budgeted.toLocaleString();
    document.getElementById('total-spent').textContent = spent.toLocaleString();
    document.getElementById('remaining').textContent = remaining.toLocaleString();
    document.getElementById('center-amount').textContent = sym + remaining.toLocaleString();

    // Update all currency symbols on the dashboard cards
    document.querySelectorAll('.stat-value > span:first-child').forEach(el => {
        el.textContent = sym;
    });

    budgetChart.data.datasets[0].data = budgeted > 0
        ? [remaining, spent, 0]
        : [0, 0, 100];
    budgetChart.update();
}

// ── SYNC CURRENCY SELECTOR ON DASHBOARD ──
window.addEventListener('DOMContentLoaded', () => {
    const sel = document.getElementById('currency-select-dashboard');
    if (!sel) return;

    // Set dropdown to saved value
    sel.value = getSavedCurrency();

    sel.addEventListener('change', () => {
        saveCurrency(sel.value);
        // Re-render symbol on center label (budgeted/spent values stay the same)
        const sym = getCurrencySymbol();
        const centerEl = document.getElementById('center-amount');
        if (centerEl) {
            const num = centerEl.textContent.replace(/[^0-9,]/g, '');
            centerEl.textContent = sym + num;
        }
        document.querySelectorAll('.stat-value > span:first-child').forEach(el => {
            el.textContent = sym;
        });
    });
});