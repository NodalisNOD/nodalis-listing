import { coins } from "./altcoins.js";

async function fetchTrendingTokens() {
  try {
    const response = await fetch('/trending');
    const tokens = await response.json();
    // Verwacht tokens als een array van objecten: { coinId, votes }
    const leftTokens = tokens.slice(0, 5);
    const rightTokens = tokens.slice(5, 10);
    populateTrendingTable('top-community-left', leftTokens);
    populateTrendingTable('top-community-right', rightTokens);
  } catch (error) {
    console.error("Error fetching trending tokens:", error);
  }
}

function populateTrendingTable(elementId, tokens) {
  const tbody = document.getElementById(elementId);
  tbody.innerHTML = '';
  tokens.forEach((token, index) => {
    // Zoek in de coins-array op basis van coinId.
    // We gaan ervan uit dat coinId gelijk is aan de coin-naam in slug-form (kleine letters, spaties vervangen door streepjes).
    let coinData = coins.find(c =>
      c.name.toLowerCase().replace(/\s+/g, "-") === token.coinId
    );
    
    // Standaard ticker en icoon
    let ticker = token.coinId; // fallback
    let iconHTML = '';
    
    // Speciale uitzondering voor "greenstix-v2-grnstx-v2"
    if (token.coinId.toLowerCase() === "greenstix-v2-grnstx-v2") {
      ticker = "GRNSTX v2";
      iconHTML = `<img src="./assets/coinIcons/GRNSTX.jpg" alt="GRNSTX v2" class="table-icon">`;
    } else if (coinData) {
      const nameParts = coinData.name.split(" ");
      ticker = nameParts[nameParts.length - 1].toUpperCase();
      iconHTML = `<img src="${coinData.icon}" alt="${ticker}" class="table-icon">`;
    }
    
    // Maak de tokennaam klikbaar: link naar coin.html?id=<coinId>
    const tokenLink = `<a href="coin.html?id=${encodeURIComponent(token.coinId)}">${iconHTML} ${ticker}</a>`;
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${tokenLink}</td>
      <td>${token.votes}</td>
    `;
    tbody.appendChild(tr);
  });
}

function getNextResetTimeUTCPlus1() {
  const now = new Date();
  // Bereken nu in UTC+1 (door 1 uur op te tellen)
  const nowUTCPlus1 = new Date(now.getTime() + 60 * 60 * 1000);
  const day = nowUTCPlus1.getUTCDay(); // zondag = 0, zaterdag = 6
  let daysUntilSunday = (7 - day) % 7;
  if (daysUntilSunday === 0 && (nowUTCPlus1.getUTCHours() > 0 || nowUTCPlus1.getUTCMinutes() > 0 || nowUTCPlus1.getUTCSeconds() > 0)) {
    daysUntilSunday = 7;
  }
  // Volgende reset: zondag 00:00 in UTC+1. In UTC is dit 23:00 de voorgaande dag.
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
