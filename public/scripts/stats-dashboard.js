import { coins, fetchCoinData } from "./altcoins.js";

// variables to store cache
let statsCache = null;
let statsCacheTime = 0;
const STATS_CACHE_DURATION = 1 * 60 * 1000; // 1 minutes

document.addEventListener("DOMContentLoaded", () => {
  fetchMarketCapAndDominance();
});

// function to fetch coin data
async function fetchMarketCapAndDominance() {
  const now = Date.now();
  
  // if cache is valid, load from cache
  if (statsCache && now - statsCacheTime < STATS_CACHE_DURATION) {
    updateDOM(statsCache);
    return;
  }

  try {
    // calculate total market cap
    const allCoinData = await Promise.all(coins.map(fetchCoinData));
    const validCoinData = allCoinData.filter((data) => data !== null);

    const totalMarketCap = validCoinData.reduce((acc, coin) => {
      const marketCap = coin.marketCap
        ? parseFloat(coin.marketCap.replace(/,/g, ""))
        : 0;
      return acc + marketCap;
    }, 0);

    // fetch Cronos market cap
    const response = await fetch(
      "https://api.geckoterminal.com/api/v2/networks/eth/tokens/0xa0b73e1ff0b80914ab6fe0444e65848c4c34450b"
    );
    const data = await response.json();
    const cronosMarketCap = parseFloat(
      data.data.attributes.market_cap_usd
    ) || 0;

    // calculate dominance
    const dominance =
      totalMarketCap > 0
        ? ((cronosMarketCap / totalMarketCap) * 100).toFixed(2)
        : 0;

    // create stats data object
    const statsData = {
      totalMarketCap,
      dominance,
    };

    // Update de cache
    statsCache = statsData;
    statsCacheTime = now;

    // update DOM
    updateDOM(statsData);
  } catch (error) {
    console.error("Error fetching market cap and dominance:", error);
  }
}

// help function to update the DOM
function updateDOM(statsData) {
  document.getElementById("market-cap").textContent = `$${statsData.totalMarketCap.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
  document.getElementById("dominance").innerHTML = `
    <img src="./assets/coinIcons/cro.png" alt="Cronos Logo" style="width: 20px; vertical-align: middle;">
    ${statsData.dominance}%
  `;
}

// help function to parse market cap value
function parseMarketCap(value) {
  if (!value) return 0;
  const cleanedValue = value.replace(/\./g, "").replace(/,/g, ".");
  return parseFloat(cleanedValue);
}
