// altcoins copy.js

// Globale variabelen
let coinTableData = [];         // Alle coins (volledige data van API)
let currentDisplayData = [];    // Huidige data (bijv. na filtering)
let currentPage = 1;
const itemsPerPage = 20;

/**
 * Haalt eerst de coin-data op uit coin-data.json en voor elke coin haalt hij
 * de actuele gegevens op via de generalApi. Hierbij wordt gecontroleerd of
 * de respons afkomstig is van Dexscreener (array) of Geckoterminal (object met data).
 * Na het ophalen wordt de standaard sortering (market cap DESC) toegepast,
 * de tabel gerenderd en worden sorteer- en zoekfunctionaliteit geactiveerd.
 */
export function populateAltcoinTable() {
  fetch("./data/coin-data.json")
    .then((response) => response.json())
    .then((coins) => {
      const promises = coins.map((coin) => {
        return fetch(coin.dynamicData.generalApi)
          .then((resp) => resp.json())
          .then((data) => {
            // Dexscreener-respons: verwacht een array met pools
            if (Array.isArray(data) && data.length > 0) {
              const dexData = data[0];
              // Tel het 24-uurs volume over alle pools op
              const volume24hTotal = data.reduce((sum, pool) => {
                return (
                  sum +
                  (pool.volume && pool.volume.h24
                    ? parseFloat(pool.volume.h24)
                    : 0)
                );
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
                marketCap:
                  dexData.marketCap !== undefined
                    ? parseFloat(dexData.marketCap)
                    : null,
                volume24h: volume24hTotal,
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
                priceUsd: gt.base_token_price_usd
                  ? parseFloat(gt.base_token_price_usd)
                  : null,
                change6h:
                  gt.price_change_percentage &&
                  gt.price_change_percentage.h6 !== undefined
                    ? parseFloat(gt.price_change_percentage.h6)
                    : 0,
                change24h:
                  gt.price_change_percentage &&
                  gt.price_change_percentage.h24 !== undefined
                    ? parseFloat(gt.price_change_percentage.h24)
                    : 0,
                // Als market_cap_usd null is, gebruik fdv_usd (indien beschikbaar)
                marketCap:
                  (gt.market_cap_usd === null || gt.market_cap_usd === undefined)
                    ? (gt.fdv_usd ? parseFloat(gt.fdv_usd) : null)
                    : parseFloat(gt.market_cap_usd),
                volume24h:
                  gt.volume_usd && gt.volume_usd.h24
                    ? parseFloat(gt.volume_usd.h24)
                    : 0,
              };
            } else {
              console.error("Geen geldige data voor coin:", coin.name);
              return null;
            }
          })
          .catch((err) => {
            console.error("Fout voor coin", coin.name, err);
            return null;
          });
      });
      return Promise.all(promises);
    })
    .then((results) => {
      coinTableData = results.filter((item) => item !== null);
      // Standaard sortering: hoogste market cap bovenaan
      coinTableData.sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0));
      // Stel huidige getoonde data in op de volledige dataset
      currentDisplayData = [...coinTableData];
      renderTable(currentDisplayData, 1);
      setupTableSort();
      setupSearch();
    })
    .catch((error) => {
      console.error("Fout bij ophalen van coin-data.json:", error);
    });
}

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
      <td>${
        coin.priceUsd !== null ? coin.priceUsd.toFixed(10) : "N/A"
      }</td>
      <td style="color: ${coin.change6h >= 0 ? "green" : "red"};">
        ${coin.change6h.toFixed(2)}%
      </td>
      <td style="color: ${coin.change24h >= 0 ? "green" : "red"};">
        ${coin.change24h.toFixed(2)}%
      </td>
      <td>${
        coin.marketCap !== null
          ? "$" + coin.marketCap.toLocaleString()
          : "N/A"
      }</td>
      <td>${
        coin.volume24h !== null
          ? "$" + coin.volume24h.toLocaleString()
          : "N/A"
      }</td>
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
      pageButton.classList.add("active"); // styling via CSS
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
