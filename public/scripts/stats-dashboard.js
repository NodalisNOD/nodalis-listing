// stats-dashboard.js

document.addEventListener("DOMContentLoaded", () => {
  fetchMarketCapAndDominance();
});

/**
 * Haalt alle coin-data op uit het JSON-bestand en verwerkt de API-responsen.
 * Ondersteunt zowel Dexscreener (array) als Geckoterminal (object met data).
 * Retourneert een array van coin-objecten.
 */
async function fetchAllCoinData() {
  try {
    const response = await fetch("./data/coin-data.json");
    const coins = await response.json();
    const promises = coins.map((coin) => {
      return fetch(coin.dynamicData.generalApi)
        .then((resp) => resp.json())
        .then((data) => {
          // Dexscreener-respons (verwacht een array met pools)
          if (Array.isArray(data) && data.length > 0) {
            const dexData = data[0];
            // Totaal 24u-volume over alle pools
            const volume24hTotal = data.reduce((sum, pool) => {
              return sum + (pool.volume && pool.volume.h24 ? parseFloat(pool.volume.h24) : 0);
            }, 0);
            return {
              id: coin.id,
              name: coin.name,
              ticker: coin.ticker,
              icon: coin.icon,
              contract: coin.contract,
              priceUsd: parseFloat(dexData.priceUsd),
              change6h:
                dexData.priceChange &&
                dexData.priceChange.h6 !== undefined &&
                dexData.priceChange.h6 !== "N/A"
                  ? parseFloat(dexData.priceChange.h6)
                  : 0,
              change24h:
                dexData.priceChange &&
                dexData.priceChange.h24 !== undefined &&
                dexData.priceChange.h24 !== "N/A"
                  ? parseFloat(dexData.priceChange.h24)
                  : 0,
              marketCap: dexData.marketCap !== undefined ? parseFloat(dexData.marketCap) : 0,
              volume24h: volume24hTotal,
            };
          }
          // Geckoterminal-respons (verwacht een object met data.data.attributes)
          else if (data && data.data) {
            const gt = data.data.attributes;
            return {
              id: coin.id,
              name: coin.name,
              ticker: coin.ticker,
              icon: coin.icon,
              contract: coin.contract,
              priceUsd: gt.base_token_price_usd ? parseFloat(gt.base_token_price_usd) : 0,
              change6h:
                gt.price_change_percentage && gt.price_change_percentage.h6 !== undefined
                  ? parseFloat(gt.price_change_percentage.h6)
                  : 0,
              change24h:
                gt.price_change_percentage && gt.price_change_percentage.h24 !== undefined
                  ? parseFloat(gt.price_change_percentage.h24)
                  : 0,
              marketCap:
                (gt.market_cap_usd === null || gt.market_cap_usd === undefined)
                  ? (gt.fdv_usd ? parseFloat(gt.fdv_usd) : 0)
                  : parseFloat(gt.market_cap_usd),
              volume24h: gt.volume_usd && gt.volume_usd.h24 ? parseFloat(gt.volume_usd.h24) : 0,
            };
          } else {
            console.error("Geen geldige data voor coin:", coin.name);
            return null;
          }
        })
        .catch((err) => {
          console.error("Fout bij ophalen van data voor coin:", coin.name, err);
          return null;
        });
    });
    const results = await Promise.all(promises);
    return results.filter((item) => item !== null);
  } catch (err) {
    console.error("Fout bij ophalen van coin-data.json:", err);
    return [];
  }
}

/**
 * Haalt de totale market cap en dominantie op.
 * De dominantie wordt berekend aan de hand van de Cronos market cap (opgehaald via Geckoterminal)
 * en de totale market cap van alle coins in ons platform.
 * Er wordt geen caching meer toegepast.
 */
async function fetchMarketCapAndDominance() {
  try {
    const allCoinData = await fetchAllCoinData();
    const totalMarketCap = allCoinData.reduce((acc, coin) => acc + (coin.marketCap || 0), 0);

    // Haal Cronos market cap op via Geckoterminal
    const response = await fetch(
      "https://api.geckoterminal.com/api/v2/networks/eth/tokens/0xa0b73e1ff0b80914ab6fe0444e65848c4c34450b"
    );
    const data = await response.json();
    const cronosMarketCap = parseFloat(data.data.attributes.market_cap_usd) || 0;

    // Bereken dominantie (%)
    const dominance = totalMarketCap > 0 ? ((cronosMarketCap / totalMarketCap) * 100).toFixed(2) : 0;

    const statsData = { totalMarketCap, dominance };

    updateDOM(statsData);
  } catch (error) {
    console.error("Error fetching market cap and dominance:", error);
  }
}

/**
 * Werkt de DOM bij met de opgehaalde stats.
 */
function updateDOM(statsData) {
  const marketCapEl = document.getElementById("market-cap");
  const dominanceEl = document.getElementById("dominance");
  if (marketCapEl) {
    marketCapEl.textContent = `$${statsData.totalMarketCap.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  if (dominanceEl) {
    dominanceEl.innerHTML = `
      <img src="./assets/coinIcons/cro.png" alt="Cronos Logo" style="width: 20px; vertical-align: middle;">
      ${statsData.dominance}%
    `;
  }
}
