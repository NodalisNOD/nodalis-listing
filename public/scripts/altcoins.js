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
let coinTableData = [];      // Data voor alle coins (uit coinCache.json) met icoon uit coin-data.json
let currentDisplayData = []; // Huidige data (bijv. na filtering)
let currentPage = 1;
const itemsPerPage = 20;

/**
 * Haalt de coin-data op uit coin-data.json (handmatig, voor het icoon)
 * en vervolgens de dynamische data uit coinCache.json.
 * We combineren deze door het icoon uit de handmatige data te gebruiken en de rest uit de cache.
 */
export function populateAltcoinTable() {
  // Eerst handmatige coin-data laden (voor icoon en overige statische info)
  fetchWithRetry("./data/coin-data.json")
    .then((response) => response.json())
    .then((manualCoinData) => {
      console.log("✅ Loaded manual coin data");
      // Vervolgens de dynamische data uit de coinCache laden
      fetchWithRetry("./data/coinCache.json")
        .then((response) => response.json())
        .then((cachedData) => {
          // Verwerk de data: cachedData is een object met keys (coin IDs)
          const results = Object.entries(cachedData).map(([key, coinData]) => {
            // Normaliseer de key (lowercase en trim)
            const normalizedKey = key.trim().toLowerCase();
            // Bepaal de coinId: gebruik coinData.id indien beschikbaar, anders de genormaliseerde key
            const coinId = coinData.id ? coinData.id.trim().toLowerCase() : normalizedKey;
            // Zoek de bijbehorende coin in de handmatige data (voor het icoon, naam, ticker, contract en chain)
            const manualCoin = manualCoinData.find(
              (c) => c.id.trim().toLowerCase() === coinId
            );
            if (!manualCoin) {
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
                id: manualCoin.id,            // uit de handmatige data
                name: manualCoin.name,          // uit de handmatige data
                ticker: manualCoin.ticker,      // uit de handmatige data (of eventueel dexData.symbol)
                icon: manualCoin.icon,          // gebruik altijd het icoon uit de handmatige data
                contract: manualCoin.contract,  // uit de handmatige data
                chain: manualCoin.chain,        // uit de handmatige data
                priceUsd: dexData.priceUsd ? parseFloat(dexData.priceUsd) : null,
                change6h:
                  dexData.priceChange && dexData.priceChange.h6 !== undefined && dexData.priceChange.h6 !== "N/A"
                    ? parseFloat(dexData.priceChange.h6)
                    : 0,
                change24h:
                  dexData.priceChange && dexData.priceChange.h24 !== undefined && dexData.priceChange.h24 !== "N/A"
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
                id: manualCoin.id,
                name: manualCoin.name,
                ticker: manualCoin.ticker,
                icon: manualCoin.icon,
                contract: manualCoin.contract,
                chain: manualCoin.chain,
                priceUsd: gt.base_token_price_usd ? parseFloat(gt.base_token_price_usd) : null,
                change6h: (gt.price_change_percentage && gt.price_change_percentage.h6 !== undefined)
                  ? parseFloat(gt.price_change_percentage.h6)
                  : 0,
                change24h: (gt.price_change_percentage && gt.price_change_percentage.h24 !== undefined)
                  ? parseFloat(gt.price_change_percentage.h24)
                  : 0,
                marketCap: (gt.market_cap_usd === null || gt.market_cap_usd === undefined)
                  ? (gt.fdv_usd ? parseFloat(gt.fdv_usd) : null)
                  : parseFloat(gt.market_cap_usd),
                volume24h: (gt.volume_usd && gt.volume_usd.h24) ? parseFloat(gt.volume_usd.h24) : 0,
              };
            } else {
              console.error("Geen geldige data voor coin:", manualCoin.name);
              return null;
            }
          });
          coinTableData = results.filter((item) => item !== null);
          console.log("✅ Gefilterde data:", coinTableData);
          // Sorteer op marketCap (aflopend)
          coinTableData.sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0));
          console.log("✅ Gesorteerde data:", coinTableData);
          currentDisplayData = [...coinTableData];
          renderTable(currentDisplayData, 1);
          setupTableSort();
          setupSearch();
          setupChainFilter();
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
      <td>${coin.priceUsd !== null ? coin.priceUsd.toFixed(10) : "N/A"}</td>
      <td style="color: ${coin.change6h >= 0 ? "green" : "red"};">${coin.change6h.toFixed(2)}%</td>
      <td style="color: ${coin.change24h >= 0 ? "green" : "red"};">${coin.change24h.toFixed(2)}%</td>
      <td>${coin.marketCap !== null ? "$" + coin.marketCap.toLocaleString() : "N/A"}</td>
      <td>${coin.volume24h !== null ? "$" + coin.volume24h.toLocaleString() : "N/A"}</td>
    `;
    tableBody.appendChild(tr);
  });
  renderPagination(data, page);
}

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
          return order === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
        } else {
          return order === "asc" ? aValue - bValue : bValue - aValue;
        }
      });
      renderTable(currentDisplayData, 1);
    });
  }
}

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

function setupChainFilter() {
  const dropdown = document.getElementById("chain-filter");
  if (!dropdown) return;

  // Verkrijg unieke chain-namen uit de coinTableData
  const chains = [...new Set(coinTableData.map((coin) => coin.chain))].sort();

  // Mapping met chain-icoontjes
  const chainIcons = {
    "Cronos": "./assets/chains/cronos.png",
    // Voeg hier andere chains en hun icoontjes toe indien nodig
  };

  dropdown.innerHTML = "";
  const selected = document.createElement("div");
  selected.classList.add("custom-dropdown-selected");
  selected.innerHTML = `<img src="./assets/UI/all.png" alt="All" class="chain-icon"> All Chains`;
  dropdown.appendChild(selected);

  const optionsContainer = document.createElement("div");
  optionsContainer.classList.add("custom-dropdown-options");
  optionsContainer.style.display = "none";

  const allOption = document.createElement("div");
  allOption.classList.add("custom-dropdown-option");
  allOption.setAttribute("data-value", "");
  allOption.innerHTML = `<img src="./assets/UI/all.png" alt="All" class="chain-icon"> All Chains`;
  optionsContainer.appendChild(allOption);

  chains.forEach((chain) => {
    const option = document.createElement("div");
    option.classList.add("custom-dropdown-option");
    option.setAttribute("data-value", chain);
    const iconSrc = chainIcons[chain] ? chainIcons[chain] : "default.png";
    option.innerHTML = `<img src="${iconSrc}" alt="${chain}" class="chain-icon"> ${chain}`;
    optionsContainer.appendChild(option);
  });

  dropdown.appendChild(optionsContainer);

  selected.addEventListener("click", () => {
    optionsContainer.style.display = optionsContainer.style.display === "none" ? "block" : "none";
  });

  optionsContainer.addEventListener("click", (e) => {
    const option = e.target.closest(".custom-dropdown-option");
    if (!option) return;
    const value = option.getAttribute("data-value");
    const icon = option.querySelector("img").src;
    selected.innerHTML = `<img src="${icon}" alt="${value || 'All'}" class="chain-icon"> ${value || "All Chains"}`;
    optionsContainer.style.display = "none";
    const filteredData = value ? coinTableData.filter((coin) => coin.chain === value) : coinTableData;
    renderTable(filteredData, 1);
  });

  document.addEventListener("click", (e) => {
    if (!dropdown.contains(e.target)) {
      optionsContainer.style.display = "none";
    }
  });
}

export { renderTable, setupSearch, setupTableSort, setupChainFilter };
