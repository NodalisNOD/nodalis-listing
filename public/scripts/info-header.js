// infoheader.js

// HTML-element waarin de info-header komt te staan
const infoHeader = document.getElementById("info-header");

// Haal Cronos-prijs op via de Geckoterminal API
async function fetchCronosPrice() {
  try {
    const response = await fetch(
      "https://api.geckoterminal.com/api/v2/simple/networks/cro/token_price/0x5c7f8a570d578ed84e63fdfa7b1ee72deae1ae23"
    );
    const data = await response.json();
    return parseFloat(
      data.data.attributes.token_prices["0x5c7f8a570d578ed84e63fdfa7b1ee72deae1ae23"]
    );
  } catch (error) {
    console.error("Error fetching Cronos price:", error);
    return null;
  }
}

// Helper: Haal alle coin-data op (zelfde logica als in newcomers-topgainers.js)
async function fetchAllCoinData() {
  try {
    const response = await fetch("./data/coin-data.json");
    const coins = await response.json();
    const promises = coins.map((coin) => {
      return fetch(coin.dynamicData.generalApi)
        .then((resp) => resp.json())
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            const dexData = data[0];
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
              addedAt: coin.addedAt || null,
            };
          } else if (data && data.data) {
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

// Update de info-header (tokens, market cap, 24h volume en Cronos-prijs)
async function updateInfoHeader() {
  if (!infoHeader) {
    console.error("Info header element niet gevonden.");
    return;
  }

  const cacheKey = "infoHeaderData";
  const cacheTimeKey = "infoHeaderDataTime";
  const CACHE_DURATION = 1 * 60 * 1000; // 1 minuut
  const now = Date.now();

  // Controleer op geldige cache-gegevens
  const cachedData = localStorage.getItem(cacheKey);
  const cachedTime = localStorage.getItem(cacheTimeKey);
  if (cachedData && cachedTime && now - parseInt(cachedTime, 10) < CACHE_DURATION) {
    const infoData = JSON.parse(cachedData);
    infoHeader.innerHTML = `
      <div class="info-item">
        <span>Tokens:</span>
        <strong>${infoData.totalTokens}</strong>
      </div>
      <div class="info-item">
        <span>Market Cap:</span>
        <strong>$${infoData.totalMarketCap.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
      </div>
      <div class="info-item">
        <span>24h Volume:</span>
        <strong>$${infoData.totalVolume24h.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
      </div>
      <div class="info-item" id="cronos-price">
        <img src="./assets/coinIcons/cro.png" alt="Cronos Logo" class="cronos-logo">
        <strong>${infoData.cronosPrice ? `$${infoData.cronosPrice.toFixed(6)}` : "N/A"}</strong>
      </div>
    `;
    console.log("✅ Info header geladen uit cache");
    return;
  }

  try {
    const allCoinData = await fetchAllCoinData();
    const totalTokens = allCoinData.length;
    const totalMarketCap = allCoinData.reduce((acc, coin) => acc + (coin.marketCap || 0), 0);
    const totalVolume24h = allCoinData.reduce((acc, coin) => acc + (coin.volume24h || 0), 0);
    const cronosPrice = await fetchCronosPrice();

    const infoData = {
      totalTokens,
      totalMarketCap,
      totalVolume24h,
      cronosPrice,
    };

    localStorage.setItem(cacheKey, JSON.stringify(infoData));
    localStorage.setItem(cacheTimeKey, now.toString());

    infoHeader.innerHTML = `
      <div class="info-item">
        <span>Tokens:</span>
        <strong>${totalTokens}</strong>
      </div>
      <div class="info-item">
        <span>Market Cap:</span>
        <strong>$${totalMarketCap.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
      </div>
      <div class="info-item">
        <span>24h Volume:</span>
        <strong>$${totalVolume24h.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
      </div>
      <div class="info-item" id="cronos-price">
        <img src="./assets/coinIcons/cro.png" alt="Cronos Logo" class="cronos-logo">
        <strong>${cronosPrice ? `$${cronosPrice.toFixed(6)}` : "N/A"}</strong>
      </div>
    `;
  } catch (error) {
    console.error("Error updating info header:", error);
  }
}

document.addEventListener("DOMContentLoaded", updateInfoHeader);
