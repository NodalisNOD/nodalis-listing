// altcoins.js

// Helper functie: fetch met retry bij 429-fouten (rate limiting)
function fetchWithRetry(url, options = {}, retries = 3, delay = 1000) {
  return fetch(url, options).then((response) => {
    if (response.status === 429 && retries > 0) {
      console.warn(`429 ontvangen voor ${url}. Opnieuw proberen in ${delay}ms...`);
      return new Promise((resolve) => setTimeout(resolve, delay))
        .then(() => fetchWithRetry(url, options, retries - 1, delay * 2));
    }
    return response;
  });
}

// Globale variabelen
let coinTableData = [];      // Alle coins (volledige data van API)
let currentDisplayData = []; // Huidige data (bijv. na filtering)
let currentPage = 1;
const itemsPerPage = 20;

/**
 * Haalt eerst de coin-data op uit coin-data.json en vervolgens uit coinCache.json.
 * Voor elke coin wordt bepaald of de data afkomstig is van Dexscreener (array) of Geckoterminal (object met data).
 * Na verwerking wordt de data gesorteerd (market cap DESC), de tabel gerenderd en de sorteer- en zoekfunctionaliteit geactiveerd.
 */
export function populateAltcoinTable() {
  fetchWithRetry("./data/coin-data.json")
    .then((response) => response.json())
    .then((manualCoinData) => {
      fetchWithRetry("./data/coinCache.json")
        .then((response) => response.json())
        .then((cachedData) => {
          
          // Verwerk de data: verwacht dat cachedData een object is met keys (coin IDs)
          const results = Object.entries(cachedData).map(([key, coinData]) => {
            // Normaliseer de key (bijv. lowercase en trim)
            const normalizedKey = key.trim().toLowerCase();
            // Gebruik de key of het id-veld uit coinData als fallback
            const coinId = coinData.id ? coinData.id.trim().toLowerCase() : normalizedKey;
            const coin = manualCoinData.find((c) => c.id.trim().toLowerCase() === coinId);
            if (!coin) {
              console.warn("Coin niet gevonden in manualCoinData:", coinId);
              return null;
            }

            // Verwerking voor Dexscreener-respons (als array)
            if (Array.isArray(coinData) && coinData.length > 0) {
              const dexData = coinData[0];
              const volume24hTotal = coinData.reduce((sum, pool) => {
                return sum + (pool.volume && pool.volume.h24 ? parseFloat(pool.volume.h24) : 0);
              }, 0);
              return {
                id: coin.id,
                name: coin.name,
                ticker: coin.ticker,
                icon: coin.icon,
                contract: coin.contract,
                priceUsd: parseFloat(dexData.priceUsd),
                change6h: dexData.priceChange && dexData.priceChange.h6 !== undefined && dexData.priceChange.h6 !== "N/A"
                  ? parseFloat(dexData.priceChange.h6)
                  : 0,
                change24h: dexData.priceChange && dexData.priceChange.h24 !== undefined && dexData.priceChange.h24 !== "N/A"
                  ? parseFloat(dexData.priceChange.h24)
                  : 0,
                marketCap: dexData.marketCap !== undefined ? parseFloat(dexData.marketCap) : null,
                volume24h: volume24hTotal,
              };
            }
            // Verwerking voor Geckoterminal-respons (als object met data)
            else if (coinData && coinData.data) {
              const gt = coinData.data.attributes;
              return {
                id: coin.id,
                name: coin.name,
                ticker: coin.ticker,
                icon: coin.icon,
                contract: coin.contract,
                priceUsd: gt.base_token_price_usd ? parseFloat(gt.base_token_price_usd) : null,
                change6h: gt.price_change_percentage && gt.price_change_percentage.h6 !== undefined
                  ? parseFloat(gt.price_change_percentage.h6)
                  : 0,
                change24h: gt.price_change_percentage && gt.price_change_percentage.h24 !== undefined
                  ? parseFloat(gt.price_change_percentage.h24)
                  : 0,
                marketCap: (gt.market_cap_usd === null || gt.market_cap_usd === undefined)
                  ? (gt.fdv_usd ? parseFloat(gt.fdv_usd) : null)
                  : parseFloat(gt.market_cap_usd),
                volume24h: gt.volume_usd && gt.volume_usd.h24 ? parseFloat(gt.volume_usd.h24) : 0,
              };
            } else {
              console.error("Geen geldige data voor coin:", coin.name);
              return null;
            }
          });

          coinTableData = results.filter((item) => item !== null);
          console.log("✅ Gefilterde data:", coinTableData);
          coinTableData.sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0));
          console.log("✅ Gesorteerde data:", coinTableData);
          currentDisplayData = [...coinTableData];
          renderTable(currentDisplayData, 1);
          setupTableSort();
          setupSearch();
        })
        .catch((error) => {
          console.error("Fout bij ophalen van coinCache.json:", error);
        });
    })
    .catch((error) => {
      console.error("Fout bij ophalen van coin-data.json:", error);
    });
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM geladen, tabel wordt ingevuld...");
  populateAltcoinTable();
});

/**
 * Render de altcoin-tabel met paginering.
 * @param {Array} data - De data-array die gerenderd moet worden (bijv. volledige of gefilterde data)
 * @param {number} page - Het huidige paginanummer (default: currentPage)
 */
function renderTable(data = coinTableData, page = currentPage) {
  currentDisplayData = data;
  currentPage = page;
  const tableBody = document.getElementById("altcoin-table");
  tableBody.innerHTML = "";

  const startIndex = (page - 1) * itemsPerPage;
  const pageData = data.slice(startIndex, startIndex + itemsPerPage);

  pageData.forEach((coin, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${startIndex + index + 1}</td>
      <td>
        <a href="coin.html?id=${coin.id}" style="display: block; text-decoration: none; color: inherit;">
          <img src="${coin.icon}" alt="${coin.name}" class="coin-icon" style="width:20px; height:20px; margin-right:5px; vertical-align:middle;">
          ${coin.name} <strong>${coin.ticker}</strong>
        </a>
      </td>
      <td>${ coin.priceUsd !== null ? coin.priceUsd.toFixed(10) : "N/A" }</td>
      <td style="color: ${coin.change6h >= 0 ? "green" : "red"};">${coin.change6h.toFixed(2)}%</td>
      <td style="color: ${coin.change24h >= 0 ? "green" : "red"};">${coin.change24h.toFixed(2)}%</td>
      <td>${ coin.marketCap !== null ? "$" + coin.marketCap.toLocaleString() : "N/A" }</td>
      <td>${ coin.volume24h !== null ? "$" + coin.volume24h.toLocaleString() : "N/A" }</td>
    `;
    tableBody.appendChild(tr);
  });
  renderPagination(data, page);
}

/**
 * Rendert de pagineringsknoppen in de container met id="pagination"
 * @param {Array} data - De data-array waarop gepagineerd wordt.
 * @param {number} page - Het huidige paginanummer.
 */
function renderPagination(data, page) {
  const paginationContainer = document.getElementById("pagination");
  paginationContainer.innerHTML = "";
  const totalPages = Math.ceil(data.length / itemsPerPage);
  if (totalPages <= 1) return; // Geen paginering nodig

  // Vorige knop
  if (page > 1) {
    const prevButton = document.createElement("button");
    prevButton.innerText = "Previous";
    prevButton.addEventListener("click", () => {
      renderTable(data, page - 1);
    });
    paginationContainer.appendChild(prevButton);
  }

  // Paginaknoppen
  for (let i = 1; i <= totalPages; i++) {
    const pageButton = document.createElement("button");
    pageButton.innerText = i;
    if (i === page) {
      pageButton.classList.add("active");
    }
    pageButton.addEventListener("click", () => {
      renderTable(data, i);
    });
    paginationContainer.appendChild(pageButton);
  }

  // Volgende knop
  if (page < totalPages) {
    const nextButton = document.createElement("button");
    nextButton.innerText = "Next";
    nextButton.addEventListener("click", () => {
      renderTable(data, page + 1);
    });
    paginationContainer.appendChild(nextButton);
  }
}

/**
 * Zet sorteer-functionaliteit op. De gebruiker kan op de volgende kolommen sorteren:
 * - Naam (alfabetisch)
 * - Price (priceUsd)
 * - 6h Change (change6h)
 * - 24h Change (change24h)
 * - Market Cap (marketCap)
 * - Volume (volume24h)
 *
 * Na sorteren wordt de getoonde data (currentDisplayData) opnieuw gerenderd (pagina 1).
 */
function setupTableSort() {
  const ths = document.querySelectorAll(".main-crypto-table thead th");
  const sortKeys = [
    "name",
    "priceUsd",
    "change6h",
    "change24h",
    "marketCap",
    "volume24h",
  ];
  for (let i = 1; i < ths.length; i++) {
    let key = sortKeys[i - 1];
    ths[i].style.cursor = "pointer";
    ths[i].addEventListener("click", () => {
      // Toggle sorteerorde
      if (!ths[i].dataset.order || ths[i].dataset.order === "desc") {
        ths[i].dataset.order = "asc";
      } else {
        ths[i].dataset.order = "desc";
      }
      const order = ths[i].dataset.order;
      currentDisplayData.sort((a, b) => {
        let aValue = a[key] !== null ? a[key] : -Infinity;
        let bValue = b[key] !== null ? b[key] : -Infinity;
        if (key === "name") {
          return order === "asc"
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        } else {
          return order === "asc" ? aValue - bValue : bValue - aValue;
        }
      });
      // Na sorteren altijd weer naar pagina 1
      renderTable(currentDisplayData, 1);
    });
  }
}

/**
 * Zet de zoekfunctionaliteit op. De gebruiker kan zoeken op coin-naam of contractadres.
 * Na filtering wordt de paginering opnieuw opgebouwd en naar pagina 1 gesprongen.
 */
function setupSearch() {
  const searchInput = document.getElementById("search-bar");
  if (!searchInput) return;
  searchInput.addEventListener("input", function () {
    const filter = this.value.toLowerCase();
    const filteredData = coinTableData.filter(
      (coin) =>
        coin.name.toLowerCase().includes(filter) ||
        coin.contract.toLowerCase().includes(filter)
    );
    renderTable(filteredData, 1);
  });
}

// Exporteer de functies zodat ze vanuit de HTML na DOMContentLoaded worden aangeroepen
export { renderTable, setupSearch, setupTableSort };
