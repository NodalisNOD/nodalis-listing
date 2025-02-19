import { coins } from "./altcoins.js";

async function fetchTrendingTokens() {
  try {
    const response = await fetch('/trending');
    const tokens = await response.json();
    populateTrendingTables(tokens);
  } catch (error) {
    console.error("Error fetching trending tokens:", error);
  }
}

/**
 * Maakt een <tr>-element voor een token op basis van de token data en de rank.
 */
function createTokenRow(token, rank) {
  // Zoek nu op coin.id in plaats van de bewerkte coin.name
  const coinData = coins.find(c => c.id === token.coinId);
  
  let ticker = token.coinId; // fallback
  let iconHTML = '';

  // Speciale case voor Greenstix v2
  if (token.coinId.toLowerCase() === "greenstix-v2-grnstx-v2") {
    ticker = "GRNSTX v2";
    iconHTML = `<img src="./assets/coinIcons/GRNSTX.jpg" alt="GRNSTX v2" class="table-icon">`;
  } else if (coinData) {
    // Gebruik de toegevoegde ticker als deze beschikbaar is, anders de coin naam
    ticker = coinData.ticker ? coinData.ticker.toUpperCase() : coinData.name;
    iconHTML = `<img src="${coinData.icon}" alt="${ticker}" class="table-icon">`;
  }

  const tokenLink = `<a href="coin.html?id=${encodeURIComponent(token.coinId)}">${iconHTML} ${ticker}</a>`;
  const tr = document.createElement('tr');
  tr.innerHTML = `<td>${rank}</td><td>${tokenLink}</td><td>${token.votes}</td>`;
  return tr;
}

/**
 * Populeert de twee tabellen met de top 10 tokens.
 * De eerste 5 tokens komen in de linker tabel, de volgende 5 in de rechter.
 */
function populateTrendingTables(tokens) {
  const leftTableBody = document.getElementById('top-community-left');
  const rightTableBody = document.getElementById('top-community-right');

  // Maak bestaande inhoud leeg
  leftTableBody.innerHTML = '';
  rightTableBody.innerHTML = '';

  // Gebruik maximaal 10 tokens
  tokens.slice(0, 10).forEach((token, index) => {
    const row = createTokenRow(token, index + 1);
    if (index < 5) {
      leftTableBody.appendChild(row);
    } else {
      rightTableBody.appendChild(row);
    }
  });
}

/**
 * Berekent de volgende reset-tijd in UTC+1 (zondag 00:00 UTC+1, oftewel zaterdag 23:00 UTC).
 */
function getNextResetTimeUTCPlus1() {
  const now = new Date();
  const nowUTCPlus1 = new Date(now.getTime() + 60 * 60 * 1000);
  const day = nowUTCPlus1.getUTCDay();
  let daysUntilSunday = (7 - day) % 7;
  
  if (
    daysUntilSunday === 0 &&
    (nowUTCPlus1.getUTCHours() > 0 ||
     nowUTCPlus1.getUTCMinutes() > 0 ||
     nowUTCPlus1.getUTCSeconds() > 0)
  ) {
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

/**
 * Update de countdown timer voor de volgende reset.
 */
function updateTrendingResetTimer() {
  const resetTimerEl = document.getElementById("trending-reset-timer");
  if (!resetTimerEl) return;
  
  const now = new Date();
  const nextReset = getNextResetTimeUTCPlus1();
  let diff = nextReset - now;
  if (diff < 0) diff = 0;
  
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  resetTimerEl.textContent = `Reset in: ${days}d ${hours}h ${minutes}m ${seconds}s`;
}

document.addEventListener('DOMContentLoaded', () => {
  fetchTrendingTokens();
  updateTrendingResetTimer();
  setInterval(updateTrendingResetTimer, 1000);
});
