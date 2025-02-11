import { coins, fetchCoinData } from "./altcoins.js";

// HTML-element voor de info-header
const infoHeader = document.getElementById("info-header");

// Functie om de Cronos-prijs op te halen
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

// Functie om een string naar een getal te parseren
function parseMarketCap(value) {
  if (!value) return 0;
  const cleanedValue = value.replace(/\./g, "").replace(/,/g, ".");
  return parseFloat(cleanedValue);
}

// Functie om de info header dynamisch te vullen (met caching van 5 minuten)
async function updateInfoHeader() {
  if (!infoHeader) {
    console.error("Info header element not found.");
    return;
  }

  const cacheKey = "infoHeaderData";
  const cacheTimeKey = "infoHeaderDataTime";
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minuten in milliseconden
  const now = Date.now();

  // Controleer of er geldige cache-data beschikbaar is
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
        <img src="./assets/cro.png" alt="Cronos Logo" class="cronos-logo">
        <strong>${infoData.cronosPrice ? `$${infoData.cronosPrice.toFixed(6)}` : "N/A"}</strong>
      </div>
    `;
    console.log("✅ Info header loaded from cache");
    return;
  }

  // Als er geen geldige cache is, haal de data op
  try {
    // Fetch data voor alle coins
    const allCoinData = await Promise.all(coins.map(fetchCoinData));
    const validCoinData = allCoinData.filter((data) => data !== null);

    // Bereken het totaal aantal tokens
    const totalTokens = validCoinData.length;

    // Bereken de totale market cap
    const totalMarketCap = validCoinData.reduce((acc, coin) => {
      const marketCap = coin.marketCap ? parseFloat(coin.marketCap.replace(/,/g, "")) : 0;
      return acc + marketCap;
    }, 0);

    // Bereken het totale volume (24h)
    const totalVolume24h = validCoinData.reduce((acc, coin) => {
      const volume = parseMarketCap(coin.volume24h);
      return acc + (volume || 0);
    }, 0);

    // Fetch de Cronos-prijs
    const cronosPrice = await fetchCronosPrice();

    // Maak een object met de info-header gegevens
    const infoData = {
      totalTokens,
      totalMarketCap,
      totalVolume24h,
      cronosPrice,
    };

    // Sla de data op in de browsercache
    localStorage.setItem(cacheKey, JSON.stringify(infoData));
    localStorage.setItem(cacheTimeKey, now.toString());

    // Update de DOM met de opgehaalde waarden
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

// Roep de functie aan bij pagina-lading
document.addEventListener("DOMContentLoaded", updateInfoHeader);
