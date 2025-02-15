import { coins, fetchCoinData } from "./altcoins.js";

// HTML element to update
const infoHeader = document.getElementById("info-header");

// function to fetch Cronos price
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

// function to parse market cap values
function parseMarketCap(value) {
  if (!value) return 0;
  const cleanedValue = value.replace(/\./g, "").replace(/,/g, ".");
  return parseFloat(cleanedValue);
}

// function to update the info header
async function updateInfoHeader() {
  if (!infoHeader) {
    console.error("Info header element not found.");
    return;
  }

  const cacheKey = "infoHeaderData";
  const cacheTimeKey = "infoHeaderDataTime";
  const CACHE_DURATION = 2 * 60 * 1000; // 5 minutes
  const now = Date.now();

  // check if valid cache data is available
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
    console.log("✅ Info header loaded from cache");
    return;
  }

  // if no valid cache data, fetch new data
  try {
    // Fetch coin data
    const allCoinData = await Promise.all(coins.map(fetchCoinData));
    const validCoinData = allCoinData.filter((data) => data !== null);

    // calculate total tokens
    const totalTokens = validCoinData.length;

    // calculate total market cap
    const totalMarketCap = validCoinData.reduce((acc, coin) => {
      const marketCap = coin.marketCap ? parseFloat(coin.marketCap.replace(/,/g, "")) : 0;
      return acc + marketCap;
    }, 0);

    // calculate total 24h volume
    const totalVolume24h = validCoinData.reduce((acc, coin) => {
      const volume = parseMarketCap(coin.volume24h);
      return acc + (volume || 0);
    }, 0);

    // fetch Cronos price
    const cronosPrice = await fetchCronosPrice();

    // create info data object
    const infoData = {
      totalTokens,
      totalMarketCap,
      totalVolume24h,
      cronosPrice,
    };

    // save data to cache
    localStorage.setItem(cacheKey, JSON.stringify(infoData));
    localStorage.setItem(cacheTimeKey, now.toString());

    // update header new data
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
        <img src="./assets/cro.png" alt="Cronos Logo" class="cronos-logo">
        <strong>${cronosPrice ? `$${cronosPrice.toFixed(6)}` : "N/A"}</strong>
      </div>
    `;
  } catch (error) {
    console.error("Error updating info header:", error);
  }
}

// call the function when the DOM is loaded
document.addEventListener("DOMContentLoaded", updateInfoHeader);
