// newcomers-topgainers.js

// Helper: Haal alle coin-data op uit het JSON-bestand en verwerk de API-respons
async function fetchAllCoinData() {
  try {
    const response = await fetch("./data/coin-data.json");
    const coins = await response.json();
    const promises = coins.map((coin) => {
      return fetch(coin.dynamicData.generalApi)
        .then((resp) => resp.json())
        .then((data) => {
          // Dexscreener-respons: verwacht een array met pools
          if (Array.isArray(data) && data.length > 0) {
            const dexData = data[0];
            // Bereken totaal 24h-volume over alle pools
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
              addedAt: coin.addedAt || null, // Indien in de JSON aanwezig
            };
          }
          // Geckoterminal-respons: verwacht een object met data.data.attributes
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
              addedAt: coin.addedAt || null,
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

// Populeer de Newcomers-tabel (eerste 5 coins, gesorteerd op 'addedAt')
async function populateNewcomersTable() {
  const newcomersTable = document.querySelector("#newcomers-table");
  if (!newcomersTable) {
    console.error("Newcomers table element niet gevonden.");
    return;
  }

  const allCoinData = await fetchAllCoinData();
  const sortedNewcomers = [...allCoinData].sort((a, b) => {
    // Als 'addedAt' ontbreekt, beschouwen we de coin als ouder (datum 0)
    const aDate = a.addedAt ? new Date(a.addedAt) : new Date(0);
    const bDate = b.addedAt ? new Date(b.addedAt) : new Date(0);
    return bDate - aDate;
  });

  newcomersTable.innerHTML = sortedNewcomers
    .slice(0, 5)
    .map(
      (coin, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>
        <a href="coin.html?id=${encodeURIComponent(coin.id)}" class="coin-link">
          <img src="${coin.icon}" alt="${coin.name} Logo" class="table-icon">
          ${coin.name}
        </a>
      </td>
      <td>$${coin.priceUsd !== null ? coin.priceUsd.toFixed(10) : "N/A"}</td>
    </tr>
  `
    )
    .join("");
}

// Populeer de Top Gainers-tabel (eerste 5 coins, gesorteerd op 24h verandering)
async function populateTopGainersTable() {
  const topGainersTable = document.querySelector("#top-gainers-table");
  if (!topGainersTable) {
    console.error("Top Gainers table element niet gevonden.");
    return;
  }

  const allCoinData = await fetchAllCoinData();
  const sortedTopGainers = [...allCoinData].sort((a, b) => b.change24h - a.change24h);

  topGainersTable.innerHTML = sortedTopGainers
    .slice(0, 5)
    .map((coin, index) => {
      const change = coin.change24h;
      const colorClass = change >= 0 ? "positive-change" : "negative-change";
      return `
    <tr>
      <td>${index + 1}</td>
      <td>
        <a href="coin.html?id=${encodeURIComponent(coin.id)}" class="coin-link">
          <img src="${coin.icon}" alt="${coin.name} Logo" class="table-icon">
          ${coin.name}
        </a>
      </td>
      <td class="${colorClass}">${change.toFixed(2)}%</td>
    </tr>
  `;
    })
    .join("");
}

// Vul de tabellen zodra de pagina geladen is
document.addEventListener("DOMContentLoaded", () => {
  populateNewcomersTable();
  populateTopGainersTable();
});
