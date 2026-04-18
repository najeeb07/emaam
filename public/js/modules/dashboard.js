// js/modules/dashboard.js
// Dashboard KPIs, recent activity & charts

import { showToast } from "../utils/toast.js";

let salesChart = null;
let availabilityChart = null;

export function initDashboard(firestore) {
  initKpis(firestore);
  initCommissionsKpis(firestore); // New call for commissions KPIs
  initCharts();
  initTransactionsWatcher(firestore);
}

function initKpis(firestore) {
  // Total properties
  firestore.collection("properties").onSnapshot(
    (snapshot) => {
      const el = document.getElementById("total-properties");
      if (el) el.textContent = snapshot.size;
    },
    (err) => console.error("properties KPI error", err)
  );

  // Total agents
  firestore.collection("agents").onSnapshot(
    (snapshot) => {
      const el = document.getElementById("total-agents");
      if (el) el.textContent = snapshot.size;
    },
    (err) => console.error("agents KPI error", err)
  );

  // Total clients (distinct clientName from transactions)
  firestore.collection("transactions").onSnapshot(
    (snapshot) => {
      const clients = new Set();
      snapshot.forEach((doc) => {
        const t = doc.data();
        if (t.clientName) clients.add(t.clientName);
      });
      const el = document.getElementById("total-clients");
      if (el) el.textContent = clients.size;
    },
    (err) => console.error("clients KPI error", err)
  );
}

// New function for commissions KPIs
function initCommissionsKpis(firestore) {
  firestore.collection("commissions").onSnapshot(
    (snapshot) => {
      let totalCommissionsToPay = 0;
      let totalRemainingCommissions = 0;

      snapshot.forEach((doc) => {
        const commission = doc.data();
        totalCommissionsToPay += commission.totalCommission || 0;
        totalRemainingCommissions += commission.remainingAmount || 0;
      });

      const totalCommissionsToPayEl = document.getElementById("total-commissions-to-pay");
      if (totalCommissionsToPayEl) {
        totalCommissionsToPayEl.textContent = totalCommissionsToPay.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
      }

      const totalRemainingCommissionsEl = document.getElementById("total-remaining-commissions");
      if (totalRemainingCommissionsEl) {
        totalRemainingCommissionsEl.textContent = totalRemainingCommissions.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
      }
    },
    (err) => console.error("commissions KPI error", err)
  );
}

function initTransactionsWatcher(firestore) {
  firestore.collection("transactions").onSnapshot(
    (snapshot) => {
      const transactions = [];
      snapshot.forEach((doc) => transactions.push({ id: doc.id, ...doc.data() }));

      const plotsSoldEl = document.getElementById("plots-sold");
      if (plotsSoldEl) plotsSoldEl.textContent = transactions.length;

      updateRecentActivity(transactions);
      updateSalesChart(transactions);
    },
    (err) => {
      console.error("transactions watcher error", err);
      showToast("Unable to load transactions for dashboard", "error");
    }
  );
}

function updateRecentActivity(transactions) {
  const tbody = document.getElementById("recent-activity-body");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (!transactions || !transactions.length) {
    tbody.innerHTML = '<tr><td colspan="3">No recent activity.</td></tr>';
    return;
  }

  const sorted = [...transactions].sort(
    (a, b) => getDate(b.dateSold) - getDate(a.dateSold)
  );
  const recentFive = sorted.slice(0, 5);

  recentFive.forEach((t) => {
    const row = tbody.insertRow();
    row.insertCell(0).textContent = formatDate(t.dateSold);
    const plotNumbers = t.plots ? t.plots.map(p => p.plotNumber).join(', ') : (t.plotNumber || "-");
    const plotLabel = plotNumbers.includes(',') ? 'Plots' : 'Plot';

    row.insertCell(1).textContent = `${plotLabel} ${plotNumbers} sold in ${t.propertyName || "-"
      }`;
    row.insertCell(2).textContent = t.agentName || "-";
  });
}

function initCharts() {
  const salesCanvas = document.getElementById("sales-over-time");
  const availabilityCanvas = document.getElementById("plots-availability");

  if (salesCanvas && !salesChart) {
    salesChart = new Chart(salesCanvas.getContext("2d"), {
      type: "line",
      data: {
        labels: [],
        datasets: [
          {
            label: "Plots Sold",
            data: [],
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true },
        },
      },
    });
  }

  if (availabilityCanvas && !availabilityChart) {
    availabilityChart = new Chart(availabilityCanvas.getContext("2d"), {
      type: "doughnut",
      data: {
        labels: ["Available", "Sold"],
        datasets: [
          {
            data: [0, 0],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
      },
    });
  }
}

export function updateAvailabilityChartForProperty(property) {
  if (!availabilityChart || !property) return;
  const total = Number(property.totalPlots || 0);
  const avail = Number(property.availablePlots || 0);
  const sold = Math.max(0, total - avail);

  availabilityChart.data.datasets[0].data = [avail, sold];
  availabilityChart.update();
}

function updateSalesChart(transactions) {
  if (!salesChart) return;

  const countsByMonth = new Map();

  transactions.forEach((t) => {
    const d = getDate(t.dateSold);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
    countsByMonth.set(key, (countsByMonth.get(key) || 0) + 1);
  });

  const labels = Array.from(countsByMonth.keys()).sort();
  const data = labels.map((k) => countsByMonth.get(k));

  salesChart.data.labels = labels;
  salesChart.data.datasets[0].data = data;
  salesChart.update();
}

function getDate(value) {
  if (!value) return new Date(0);
  if (value.toDate) return value.toDate();
  return new Date(value);
}

function formatDate(value) {
  const d = getDate(value);
  if (!d || isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
