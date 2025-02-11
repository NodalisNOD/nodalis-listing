import { coins, fetchCoinData } from "./altcoins.js";

document.addEventListener("DOMContentLoaded", () => {
  fetchMarketCapAndDominance();
});

// Functie om Market Cap en Dominance te laden
async function fetchMarketCapAndDominance() {
  try {
    // Bereken totale market cap van jouw platform
    const allCoinData = await Promise.all(coins.map(fetchCoinData));
    const validCoinData = allCoinData.filter((data) => data !== null);

const totalMarketCap = validCoinData.reduce((acc, coin) => {
  const marketCap = coin.marketCap ? parseFloat(coin.marketCap.replace(/,/g, '')) : 0;
  return acc + (marketCap || 0);
}, 0);


    // Haal market cap van Cronos op
    const response = await fetch(
      "https://api.geckoterminal.com/api/v2/networks/eth/tokens/0xa0b73e1ff0b80914ab6fe0444e65848c4c34450b"
    );
    const data = await response.json();
    const cronosMarketCap = parseFloat(data.data.attributes.market_cap_usd) || 0;

    // Bereken Dominance
    const dominance = totalMarketCap > 0 ? ((cronosMarketCap / totalMarketCap) * 100).toFixed(2) : 0;

    // Update DOM
    document.getElementById("market-cap").textContent = `$${totalMarketCap.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
    document.getElementById("dominance").innerHTML = `
      <img src="./assets/cro.png" alt="Cronos Logo" style="width: 20px; vertical-align: middle;">
      ${dominance}%
    `;
  } catch (error) {
    console.error("Error fetching market cap and dominance:", error);
  }
}

// Helper functie om een string naar een numerieke market cap te parseren
function parseMarketCap(value) {
  if (!value) return 0;
  const cleanedValue = value.replace(/\./g, "").replace(/,/g, ".");
  return parseFloat(cleanedValue);
}
