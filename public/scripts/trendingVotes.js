import { coins } from "./altcoins.js";

async function fetchTrendingTokens() {
  try {
    const response = await fetch('/trending');
    const tokens = await response.json();
    // Populate the two tables
    populateTrendingTables(tokens);
  } catch (error) {
    console.error("Error fetching trending tokens:", error);
  }
}

function populateTrendingTables(tokens) {
  const leftTableBody = document.getElementById('top-community-left');
  const rightTableBody = document.getElementById('top-community-right');

  // Clear any existing rows
  leftTableBody.innerHTML = '';
  rightTableBody.innerHTML = '';

  // Split the data into two arrays of five items each
  const leftColumn = tokens.slice(0, 5);
  const rightColumn = tokens.slice(5, 10);

  // Populate the left column
  leftColumn.forEach((token, index) => {
    let coinData = coins.find(c =>
      c.name.toLowerCase().replace(/\s+/g, "-") === token.coinId
    );

    let ticker = token.coinId; // fallback
    let iconHTML = '';

    if (token.coinId.toLowerCase() === "greenstix-v2-grnstx-v2") {
      ticker = "GRNSTX v2";
      iconHTML = `<img src="./assets/coinIcons/GRNSTX.jpg" alt="GRNSTX v2" class="table-icon">`;
    } else if (coinData) {
      const nameParts = coinData.name.split(" ");
      ticker = nameParts[nameParts.length - 1].toUpperCase();
      iconHTML = `<img src="${coinData.icon}" alt="${ticker}" class="table-icon">`;
    }

    const tokenLink = `<a href="coin.html?id=${encodeURIComponent(token.coinId)}">${iconHTML} ${ticker}</a>`;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${tokenLink}</td>
      <td>${token.votes}</td>
    `;
    leftTableBody.appendChild(tr);
  });

  // Populate the right column
  rightColumn.forEach((token, index) => {
    let coinData = coins.find(c =>
      c.name.toLowerCase().replace(/\s+/g, "-") === token.coinId
    );

    let ticker = token.coinId; // fallback
    let iconHTML = '';

    if (token.coinId.toLowerCase() === "greenstix-v2-grnstx-v2") {
      ticker = "GRNSTX v2";
      iconHTML = `<img src="./assets/coinIcons/GRNSTX.jpg" alt="GRNSTX v2" class="table-icon">`;
    } else if (coinData) {
      const nameParts = coinData.name.split(" ");
      ticker = nameParts[nameParts.length - 1].toUpperCase();
      iconHTML = `<img src="${coinData.icon}" alt="${ticker}" class="table-icon">`;
    }

    const tokenLink = `<a href="coin.html?id=${encodeURIComponent(token.coinId)}">${iconHTML} ${ticker}</a>`;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${index + 6}</td>
      <td>${tokenLink}</td>
      <td>${token.votes}</td>
    `;
    rightTableBody.appendChild(tr);
  });
}

// Berekent de volgende resettijd in UTC+1 (zondag 00:00 UTC+1, oftewel zaterdag 23:00 UTC)
function getNextResetTimeUTCPlus1() {
  const now = new Date();
  const nowUTCPlus1 = new Date(now.getTime() + 60 * 60 * 1000);
  const day = nowUTCPlus1.getUTCDay(); 
  let daysUntilSunday = (7 - day) % 7;
  if (daysUntilSunday === 0 && (nowUTCPlus1.getUTCHours() > 0 || nowUTCPlus1.getUTCMinutes() > 0 || nowUTCPlus1.getUTCSeconds() > 0)) {
    daysUntilSunday = 7;
  }
  const nextResetUTCPlus1 = new Date(Date.UTC(
    nowUTCPlus1.getUTCFullYear(),
    nowUTCPlus1.getUTCMonth(),
    nowUTCPlus1.getUTCDate() + daysUntilSunday,
    0, 0, 0
  ));
  return new Date(nextResetUTCPlus1.getTime() - 60 * 60 * 1000);
}

function updateTrendingResetTimer() {
  const resetTimerEl = document.getElementById("trending-reset-timer");
  if (!resetTimerEl) return;
  const now = new Date();
  const nextReset = getNextResetTimeUTCPlus1();
  let diff = nextReset - now;
  if (diff < 0) diff = 0;
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / (3600 * 24));
  const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  resetTimerEl.textContent = `Reset in: ${days}d ${hours}h ${minutes}m ${seconds}s`;
}

document.addEventListener('DOMContentLoaded', () => {
  fetchTrendingTokens();
  updateTrendingResetTimer();
  setInterval(updateTrendingResetTimer, 1000);
});
