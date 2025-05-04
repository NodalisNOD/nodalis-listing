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
let currentDisplayData = []; // Huidige data (na filtering)
let currentPage = 1;
const itemsPerPage = 20;

// populateAltcoinTable.js --- 
export function populateAltcoinTable() {
  return fetchWithRetry("./data/coin-data.json")
    .then((response) => response.json())
    .then((manualCoinData) => {
      return fetchWithRetry("./data/coinCache.json")
        .then((response) => response.json())
        .then((cachedData) => {
          const results = Object.entries(cachedData).map(([key, coinData]) => {
            const normalizedKey = key.trim().toLowerCase();
            const coinId = coinData.id
              ? coinData.id.trim().toLowerCase()
              : normalizedKey;
            const manualCoin = manualCoinData.find(
              (c) => c.id.trim().toLowerCase() === coinId
            );
            if (!manualCoin) return null;

            // ── bepaal of 'verify' in de badges staat ──
            const badges = Array.isArray(manualCoin.badges)
              ? manualCoin.badges
              : [];
            const isVerified = badges.includes("verify");

            let priceUsd, change6h, change24h, marketCap, volume24h;
            if (Array.isArray(coinData) && coinData.length > 0) {
              const dexData = coinData[0];
              volume24h = coinData.reduce(
                (sum, pool) =>
                  sum +
                  (pool.volume?.h24 ? parseFloat(pool.volume.h24) : 0),
                0
              );
              priceUsd = dexData.priceUsd
                ? parseFloat(dexData.priceUsd)
                : null;
              change6h =
                dexData.priceChange?.h6 &&
                dexData.priceChange.h6 !== "N/A"
                  ? parseFloat(dexData.priceChange.h6)
                  : 0;
              change24h =
                dexData.priceChange?.h24 &&
                dexData.priceChange.h24 !== "N/A"
                  ? parseFloat(dexData.priceChange.h24)
                  : 0;
              marketCap =
                dexData.marketCap !== undefined
                  ? parseFloat(dexData.marketCap)
                  : null;
            } else if (coinData?.data) {
              const gt = coinData.data.attributes;
              priceUsd = gt.base_token_price_usd
                ? parseFloat(gt.base_token_price_usd)
                : null;
              change6h =
                gt.price_change_percentage?.h6 !== undefined
                  ? parseFloat(gt.price_change_percentage.h6)
                  : 0;
              change24h =
                gt.price_change_percentage?.h24 !== undefined
                  ? parseFloat(gt.price_change_percentage.h24)
                  : 0;
              marketCap =
                gt.market_cap_usd != null
                  ? parseFloat(gt.market_cap_usd)
                  : gt.fdv_usd
                  ? parseFloat(gt.fdv_usd)
                  : null;
              volume24h = gt.volume_usd?.h24
                ? parseFloat(gt.volume_usd.h24)
                : 0;
            } else {
              return null;
            }

            return {
              id: manualCoin.id,
              name: manualCoin.name,
              ticker: manualCoin.ticker,
              icon: manualCoin.icon,
              contract: manualCoin.contract,
              chain: manualCoin.chain,
              category: manualCoin.category || "",
              priceUsd,
              change6h,
              change24h,
              marketCap,
              volume24h,
              isVerified,    // ── hier toevoegen
            };
          });

          coinTableData = results.filter((x) => x !== null);
          coinTableData.sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0));
          currentDisplayData = [...coinTableData];
          renderTable(currentDisplayData, 1);
          setupTableSort();
        });
    });
}


document.addEventListener("DOMContentLoaded", () => {
  // populateAltcoinTable wordt van buiten aangeroepen
});
// ---  renderTable in altcoins.js --- //
function renderTable(data = coinTableData, page = currentPage) {
  currentDisplayData = data;
  currentPage = page;
  const tableBody = document.getElementById("altcoin-table");
  tableBody.innerHTML = "";

  const startIndex = (page - 1) * itemsPerPage;
  data.slice(startIndex, startIndex + itemsPerPage).forEach((coin, idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${startIndex + idx + 1}</td>
      <td>
        <a href="coin.html?id=${coin.id}" class="coin-link">
          <span class="icon-wrapper">
            <img
              src="${coin.icon}"
              alt="${coin.name}"
              class="coin-icon"
            >
            ${
              coin.isVerified
                ? `<img
                     src="/assets/UI/badges/verify.png"
                     alt="Verified"
                     class="verify-overlay"
                   >`
                : ""
            }
          </span>
          ${coin.name} <strong>${coin.ticker}</strong>
        </a>
      </td>
      <td>${
        coin.priceUsd != null ? coin.priceUsd.toFixed(10) : "N/A"
      }</td>
      <td style="color:${
        coin.change6h >= 0 ? "green" : "red"
      }">${coin.change6h.toFixed(2)}%</td>
      <td style="color:${
        coin.change24h >= 0 ? "green" : "red"
      }">${coin.change24h.toFixed(2)}%</td>
      <td>${
        coin.marketCap != null
          ? "$" + coin.marketCap.toLocaleString()
          : "N/A"
      }</td>
      <td>${
        coin.volume24h != null
          ? "$" + coin.volume24h.toLocaleString()
          : "N/A"
      }</td>
    `;
    tableBody.appendChild(tr);
  });

  renderPagination(data, page);
}

function renderPagination(data, page) {
  const container = document.getElementById("pagination");
  container.innerHTML = "";
  const total = Math.ceil(data.length / itemsPerPage);
  if (total < 2) return;
  if (page > 1) createPageBtn('Previous', page - 1, container);
  for (let i = 1; i <= total; i++) createPageBtn(i, i, container, page);
  if (page < total) createPageBtn('Next', page + 1, container);
}
function createPageBtn(label, p, container, current) {
  const btn = document.createElement('button');
  btn.innerText = label;
  if (p === current) btn.classList.add('active');
  btn.addEventListener('click', () => renderTable(currentDisplayData, p));
  container.appendChild(btn);
}

function setupTableSort() {
  const ths = document.querySelectorAll('.main-crypto-table thead th');
  const keys = ['name', 'priceUsd', 'change6h', 'change24h', 'marketCap', 'volume24h'];
  ths.forEach((th, i) => {
    if (i > 0) {
      th.style.cursor = 'pointer';
      th.addEventListener('click', () => {
        const key = keys[i - 1];
        th.dataset.order = th.dataset.order === 'asc' ? 'desc' : 'asc';
        const order = th.dataset.order;
        currentDisplayData.sort((a, b) => {
          let av = a[key] != null ? a[key] : -Infinity;
          let bv = b[key] != null ? b[key] : -Infinity;
          if (key === 'name') return order === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
          return order === 'asc' ? av - bv : bv - av;
        });
        renderTable(currentDisplayData, 1);
      });
    }
  });
}

function setupSearch() {
  const input = document.getElementById('search-bar');
  input.addEventListener('input', () => {
    const f = input.value.toLowerCase();
    const filt = coinTableData.filter(c => c.name.toLowerCase().includes(f) || c.contract.toLowerCase().includes(f));
    renderTable(filt, 1);
  });
}

// 🌐 Mapping chain → icoon pad
const chainIcons = {
  Cronos: "./assets/UI/chains/cronos.png",
  Ethereum: "./assets/UI/chains/ethereum.png",
  BSC: "./assets/UI/chains/bsc.png",
  Polygon: "./assets/UI/chains/polygon.png",
  // voeg hier je eigen chains toe…
};

// ✨ setupChainFilter (vervang je huidige functie hiermee)
function setupChainFilter() {
  const dropdown = document.getElementById("chain-filter");
  const selected = dropdown.querySelector(".custom-dropdown-selected");
  const optionsContainer = dropdown.querySelector(".custom-dropdown-options");

  // Haal alle unieke chains uit coinTableData
  const chains = Array.from(
    new Set(coinTableData.map((c) => c.chain).filter(Boolean))
  ).sort();
  const allChains = ["All Chains", ...chains];

  // Clear oude opties
  optionsContainer.innerHTML = "";

  // Bouw een optie voor elke chain
  allChains.forEach((chain) => {
    const opt = document.createElement("div");
    opt.className = "custom-dropdown-option";
    opt.setAttribute("data-value", chain);

    // Kies icoon of fallback
    const iconSrc = chainIcons[chain] || "./assets/UI/all.png";

    opt.innerHTML = `
      <img src="${iconSrc}" alt="${chain} icon" class="filter-icon" />
      <span class="filter-label">${chain}</span>
    `;
    optionsContainer.appendChild(opt);

    // Klik-handler: filter en sluit dropdown
    opt.addEventListener("click", () => {
      // Active state
      optionsContainer
        .querySelectorAll(".custom-dropdown-option.active")
        .forEach((el) => el.classList.remove("active"));
      opt.classList.add("active");

      // Toon geselecteerde in header
      selected.innerHTML = `
        <img src="${iconSrc}" alt="${chain} icon" class="filter-icon" />
        ${chain}
      `;

      // Sluit menu
      dropdown.classList.remove("open");

      // Pas filter toe
      const filtered =
        chain === "All Chains"
          ? coinTableData
          : coinTableData.filter((c) => c.chain === chain);
      renderTable(filtered, 1);
    });
  });

  // Open/close dropdown op click
  selected.addEventListener("click", () => {
    dropdown.classList.toggle("open");
  });

  // Sluit dropdown als je buiten klikt
  document.addEventListener("click", (e) => {
    if (!dropdown.contains(e.target)) {
      dropdown.classList.remove("open");
    }
  });
}


// 🌟 Mapping categorie → icoon pad
const categoryIcons = {
  Meme:            "./assets/UI/categories/meme.png",
  Gaming:          "./assets/UI/categories/gaming.png",
  "Utility Token": "./assets/UI/categories/utility.png",
  NFT:             "./assets/UI/categories/nft.png",       // ✂️ geen spaties in pad
  "DEX/Exchange":  "./assets/UI/categories/dex.png",
  // voeg hier je eigen categorieën en iconen toe…
};

// ✨ setupCategoryFilter (vervang je huidige functie hiermee)
function setupCategoryFilter() {
  const dropdown = document.getElementById("category-filter");
  const selected = dropdown.querySelector(".custom-dropdown-selected");
  const optionsContainer = dropdown.querySelector(".custom-dropdown-options");

  // 1) Verzamel ALLE categorieën (ondersteunt zowel c.categories als c.category)
  const cats = Array.from(
    new Set(
      coinTableData
        .flatMap(c =>
          Array.isArray(c.categories)
            ? c.categories
            : typeof c.category === "string"
              ? [c.category]
              : []
        )
        .filter(Boolean)
    )
  ).sort();

  console.log("Beschikbare categorieën:", cats); // <-- check hier wat er in cats zit

  const allCats = ["All Categories", ...cats];

  // 2) Maak dropdown leeg
  optionsContainer.innerHTML = "";

  // 3) Bouw opties voor elke categorie
  allCats.forEach(cat => {
    const iconSrc = categoryIcons[cat] || "./assets/UI/all.png";
    const opt = document.createElement("div");
    opt.className = "custom-dropdown-option";
    opt.setAttribute("data-value", cat);
    opt.innerHTML = `
      <img src="${iconSrc}" alt="${cat} icon" class="filter-icon" />
      <span class="filter-label">${cat}</span>
    `;
    optionsContainer.appendChild(opt);

    // Klik-handler
    opt.addEventListener("click", () => {
      // Active-state
      optionsContainer
        .querySelectorAll(".custom-dropdown-option.active")
        .forEach(el => el.classList.remove("active"));
      opt.classList.add("active");

      // Update header
      selected.innerHTML = `
        <img src="${iconSrc}" alt="${cat} icon" class="filter-icon" />
        ${cat}
      `;

      // Sluit dropdown
      dropdown.classList.remove("open");

      // Filter coins
      const filtered = cat === "All Categories"
        ? coinTableData
        : coinTableData.filter(c =>
            Array.isArray(c.categories)
              ? c.categories.includes(cat)
              : c.category === cat
          );

      renderTable(filtered, 1);
    });
  });

  // Open/close dropdown
  selected.addEventListener("click", () => {
    dropdown.classList.toggle("open");
  });

  // Sluit bij buitenklik
  document.addEventListener("click", e => {
    if (!dropdown.contains(e.target)) {
      dropdown.classList.remove("open");
    }
  });
}



// Helper: init dropdown
function initDropdown(container, items, onSelect) {
  const sel = container.querySelector('.custom-dropdown-selected');
  const opts = container.querySelector('.custom-dropdown-options');
  sel.innerHTML = `<img src="./assets/UI/all.png" class="chain-icon"> ${items[0]}`;
  opts.innerHTML = '';
  items.forEach(item => {
    const div = document.createElement('div');
    div.className = 'custom-dropdown-option';
    div.textContent = item;
    opts.appendChild(div);
    div.addEventListener('click', () => {
      sel.innerHTML = `<img src="./assets/UI/all.png" class="chain-icon"> ${item}`;
      opts.style.display = 'none';
      onSelect(item);
    });
  });
  sel.addEventListener('click', () => {
    opts.style.display = opts.style.display === 'block' ? 'none' : 'block';
  });
  document.addEventListener('click', e => {
    if (!container.contains(e.target)) opts.style.display = 'none';
  });
}

export { renderTable, setupSearch, setupTableSort, setupChainFilter, setupCategoryFilter };
