// infoheader.js

// HTML element in which the info header will be rendered
const infoHeader = document.getElementById("info-header");

// Fetch Cronos price from local croPrice.json
async function fetchCronosPrice() {
  try {
    const response = await fetch("./data/croPrice.json");
    if (!response.ok) {
      throw new Error("Error fetching croPrice.json");
    }
    const data = await response.json();
    return parseFloat(data.cronosPrice);
  } catch (error) {
    console.error("Error fetching Cronos price from local file:", error);
    return null;
  }
}

// Fetch Nodalis price from coinCache.json using the "nodalis" key
async function fetchNodalisPrice() {
  try {
    const response = await fetch("./data/coinCache.json");
    if (!response.ok) {
      throw new Error("Error fetching coinCache.json");
    }
    const data = await response.json();
    if (data.nodalis && Array.isArray(data.nodalis) && data.nodalis.length > 0) {
      return parseFloat(data.nodalis[0].priceUsd);
    }
    return null;
  } catch (error) {
    console.error("Error fetching Nodalis price:", error);
    return null;
  }
}

// Helper: Fetch dynamic metrics (market cap and 24h volume) from coinCache.json
// It iterates over all keys, deduplicates tokens (using either a Gecko Terminal "id" or the lowercased baseToken address)
// and sums up the market cap and 24h volume.
async function fetchCoinCacheMetrics() {
  try {
    const response = await fetch("./data/coinCache.json");
    if (!response.ok) {
      throw new Error("Error fetching coinCache.json");
    }
    const coinCache = await response.json();
    let uniqueTokens = {};
    Object.keys(coinCache).forEach((key) => {
      const entry = coinCache[key];
      if (Array.isArray(entry)) {
        entry.forEach((token) => {
          let uniqueKey = null;
          // Prefer Gecko Terminal "id" if available; otherwise, use the baseToken address
          if (token.id) {
            uniqueKey = token.id.trim().toLowerCase();
          } else if (token.baseToken && token.baseToken.address) {
            uniqueKey = token.baseToken.address.trim().toLowerCase();
          }
          if (uniqueKey && !uniqueTokens[uniqueKey]) {
            uniqueTokens[uniqueKey] = token;
          }
        });
      } else if (typeof entry === "object" && entry !== null) {
        let uniqueKey = null;
        if (entry.id) {
          uniqueKey = entry.id.trim().toLowerCase();
        } else if (entry.baseToken && entry.baseToken.address) {
          uniqueKey = entry.baseToken.address.trim().toLowerCase();
        }
        if (uniqueKey && !uniqueTokens[uniqueKey]) {
          uniqueTokens[uniqueKey] = entry;
        }
      }
    });

    const tokensArray = Object.values(uniqueTokens);
    const totalMarketCap = tokensArray.reduce((sum, token) => {
      const mc = token.marketCap ? parseFloat(token.marketCap) : 0;
      return sum + mc;
    }, 0);
    const totalVolume24h = tokensArray.reduce((sum, token) => {
      const vol = token.volume && token.volume.h24 ? parseFloat(token.volume.h24) : 0;
      return sum + vol;
    }, 0);

    return { totalMarketCap, totalVolume24h };
  } catch (error) {
    console.error("Error fetching metrics from coinCache.json:", error);
    return { totalMarketCap: 0, totalVolume24h: 0 };
  }
}

// The existing fetchAllCoinData() remains unchanged – it fetches static coin data and is used for token count.
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
            console.error("Invalid data for coin:", coin.name);
            return null;
          }
        })
        .catch((err) => {
          console.error("Error fetching data for coin:", coin.name, err);
          return null;
        });
    });
    const results = await Promise.all(promises);
    return results.filter((item) => item !== null);
  } catch (err) {
    console.error("Error fetching coin-data.json:", err);
    return [];
  }
}

// Update the info header with token count (from coin-data), market cap and 24h volume (from coinCache),
// as well as Cronos and Nodalis prices.
async function updateInfoHeader() {
  if (!infoHeader) {
    console.error("Info header element not found.");
    return;
  }

  const cacheKey = "infoHeaderData";
  const cacheTimeKey = "infoHeaderDataTime";
  const CACHE_DURATION = 1 * 60 * 1000; // 1 minute
  const now = Date.now();

  // Check if data is cached
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
      <div class="info-item" id="nodalis-price">
        <img src="./assets/coinIcons/nod.png" alt="Nodalis Logo" class="nodalis-logo">
        <strong>${infoData.nodalisPrice ? `$${infoData.nodalisPrice.toFixed(6)}` : "N/A"}</strong>
      </div>
    `;
    console.log("✅ Info header loaded from cache");
    return;
  }

  try {
    // Get token count from coin-data.json
    const allCoinData = await fetchAllCoinData();
    const totalTokens = allCoinData.length;

    // Get market cap and volume from coinCache.json
    const { totalMarketCap, totalVolume24h } = await fetchCoinCacheMetrics();
    const cronosPrice = await fetchCronosPrice();
    const nodalisPrice = await fetchNodalisPrice();

    const infoData = {
      totalTokens,
      totalMarketCap,
      totalVolume24h,
      cronosPrice,
      nodalisPrice,
    };

    // Cache the info data
    localStorage.setItem(cacheKey, JSON.stringify(infoData));
    localStorage.setItem(cacheTimeKey, now.toString());

    // Update the info header HTML
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
      <div class="info-item" id="nodalis-price">
        <img src="./assets/coinIcons/nod.png" alt="Nodalis Logo" class="nodalis-logo">
        <strong>${nodalisPrice ? `$${nodalisPrice.toFixed(6)}` : "N/A"}</strong>
      </div>
    `;
  } catch (error) {
    console.error("Error updating info header:", error);
  }
}

document.addEventListener("DOMContentLoaded", updateInfoHeader);
