import { coins, fetchCoinData } from "./altcoins.js";

// Cache-variabelen voor de dashboard-data
let statsCache = null;
let statsCacheTime = 0;
const STATS_CACHE_DURATION = 10 * 60 * 1000; // 10 minuten in milliseconden

document.addEventListener("DOMContentLoaded", () => {
  fetchMarketCapAndDominance();
});

// Functie om Market Cap en Dominance te laden (met caching)
async function fetchMarketCapAndDominance() {
  const now = Date.now();
  
  // Als de cache nog geldig is, werk dan direct de DOM bij en stop de functie.
  if (statsCache && now - statsCacheTime < STATS_CACHE_DURATION) {
    console.log("✅ Dashboard stats vanuit cache laden");
    updateDOM(statsCache);
    return;
  }

  try {
    // Bereken totale market cap van jouw platform
    const allCoinData = await Promise.all(coins.map(fetchCoinData));
    const validCoinData = allCoinData.filter((data) => data !== null);

    const totalMarketCap = validCoinData.reduce((acc, coin) => {
      const marketCap = coin.marketCap
        ? parseFloat(coin.marketCap.replace(/,/g, ""))
        : 0;
      return acc + marketCap;
    }, 0);

    // Haal market cap van Cronos op
    const response = await fetch(
      "https://api.geckoterminal.com/api/v2/networks/eth/tokens/0xa0b73e1ff0b80914ab6fe0444e65848c4c34450b"
    );
    const data = await response.json();
    const cronosMarketCap = parseFloat(
      data.data.attributes.market_cap_usd
    ) || 0;

    // Bereken Dominance
    const dominance =
      totalMarketCap > 0
        ? ((cronosMarketCap / totalMarketCap) * 100).toFixed(2)
        : 0;

    // Maak een object met de relevante statistieken
    const statsData = {
      totalMarketCap,
      dominance,
    };

    // Update de cache
    statsCache = statsData;
    statsCacheTime = now;

    // Update de DOM met de nieuwe data
    updateDOM(statsData);
  } catch (error) {
    console.error("Error fetching market cap and dominance:", error);
  }
}

// Helper-functie om de DOM te updaten met de stats
function updateDOM(statsData) {
  document.getElementById("market-cap").textContent = `$${statsData.totalMarketCap.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
  document.getElementById("dominance").innerHTML = `
    <img src="./assets/cro.png" alt="Cronos Logo" style="width: 20px; vertical-align: middle;">
    ${statsData.dominance}%
  `;
}

// Helper functie om een string naar een numerieke market cap te parseren (indien nodig)
function parseMarketCap(value) {
  if (!value) return 0;
  const cleanedValue = value.replace(/\./g, "").replace(/,/g, ".");
  return parseFloat(cleanedValue);
}
