// coin.js

// Haal de coinId uit de URL-query parameters
const params = new URLSearchParams(window.location.search);
let coinId = params.get("id");
if (coinId) {
  coinId = coinId.toLowerCase().replace(/\s+/g, "-");
} else {
  alert("No coin selected!");
  window.location.href = "index.html";
}

// Globale variabelen
let marketData = [];

// Dex icon mapping voor markten
const dexIcons = {
  vvs: { icon: "./assets/coinIcons/vvs.jpg", name: "VVS Finance" },
  "vvs-v3": { icon: "./assets/coinIcons/vvs.jpg", name: "VVS Finance" },
  "vvsfinance": { icon: "./assets/coinIcons/vvs.jpg", name: "VVS Finance" },
  mm_finance: { icon: "./assets/coinIcons/mmf.jpg", name: "MM Finance" },
  "mmfinance": { icon: "./assets/coinIcons/mmf.jpg", name: "MM Finance" },
  "ebisus-bay": { icon: "./assets/coinIcons/ebisus.png", name: "Ebisus Bay" },
  "obsidian-finance": { icon: "./assets/coinIcons/obsidian.jpg", name: "Obsidian Finance" },
  crodex: { icon: "./assets/coinIcons/crx.png", name: "Crodex" },
  cronaswap: { icon: "./assets/coinIcons/crona.jpg", name: "CronaSwap" },
  "phenix-finance-cronos": { icon: "./assets/coinIcons/phenix.webp", name: "PhenixFinance" },
  "candycity_finance": { icon: "./assets/UI/candycity.png", name: "Candy City" },
};

/**
 * Haal de relevante waarden uit een pair-object.
 * Ondersteunt zowel de geneste structuur (geckoterminal) als de vlakke structuur (dexscreener).
 */
function getPairValues(pair) {
  let vol = 0, liq = 0, price = 0, mc = 0;
  if (pair.data && pair.data.attributes) {
    // Geckoterminal structuur
    const attr = pair.data.attributes;
    vol = parseFloat(attr.volume_usd?.h24) || 0;
    liq = parseFloat(attr.reserve_in_usd) || 0;
    price = parseFloat(attr.base_token_price_usd) || 0;
    mc = parseFloat(attr.market_cap_usd);
    if (isNaN(mc)) {
      mc = parseFloat(attr.fdv_usd) || 0;
    }
  } else {
    // Dexscreener (platte) structuur
    vol = parseFloat(pair.volume?.h24) || 0;
    liq = parseFloat(pair.liquidity?.usd) || 0;
    price = parseFloat(pair.priceUsd) || 0;
    mc = parseFloat(pair.marketCap);
    if (isNaN(mc)) {
      mc = parseFloat(pair.fdv) || 0;
    }
  }
  return { vol, liq, price, mc };
}

/**
 * Aggregatie van dynamische data uit de cache (over meerdere paren)
 */
function aggregateDynamicData(pairs) {
  let totalVolume = 0;
  let totalLiquidity = 0;
  let weightedPriceSum = 0;
  let totalMarketCap = 0;

  pairs.forEach(pair => {
    const { vol, liq, price, mc } = getPairValues(pair);
    totalVolume += vol;
    totalLiquidity += liq;
    weightedPriceSum += price * liq;
    totalMarketCap += mc;
  });

  const aggregatedPrice = totalLiquidity > 0 ? weightedPriceSum / totalLiquidity : 0;

  return {
    price: aggregatedPrice,
    volume: totalVolume,
    liquidity: totalLiquidity,
    marketCap: totalMarketCap
  };
}

/**
 * Render de markten in een tabel.
 */
function renderMarkets(markets) {
  const marketsTable = document.getElementById("markets-table");
  if (!marketsTable) return;
  marketsTable.innerHTML = ""; // Reset de tabel

  markets.forEach((market) => {
    const attributes = (market.data && market.data.attributes) ? market.data.attributes : market;
    const dex = market.dexId || (market.data && market.data.relationships && market.data.relationships.dex.data.id);
    const dexData = dexIcons[dex] || { icon: "./assets/default.png", name: dex || "Unknown" };

    let pairName = attributes.name;
    if (!pairName) {
      if (market.baseToken && market.quoteToken) {
        pairName = `${market.baseToken.symbol.trim()} / ${market.quoteToken.symbol.trim()}`;
      } else {
        pairName = "N/A";
      }
    }

    const price = parseFloat(attributes.base_token_price_usd || market.priceUsd || 0).toFixed(10);
    const volume = parseFloat(attributes.volume_usd?.h24 || (market.volume && market.volume.h24) || 0).toLocaleString();
    const liquidity = parseFloat(attributes.reserve_in_usd || (market.liquidity && market.liquidity.usd) || 0).toLocaleString();

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>
        <img src="${dexData.icon}" alt="${dexData.name}" class="dex-icon" width="16" height="16">
        <span>${dexData.name}</span>
      </td>
      <td>${pairName}</td>
      <td>$${price}</td>
      <td>$${volume}</td>
      <td>$${liquidity}</td>
    `;
    marketsTable.appendChild(row);
  });
}

/**
 * Haal de statische coin data op én voeg de dynamische cache-gegevens toe.
 */
async function fetchCoinDetails() {
  try {
    const staticResponse = await fetch("/data/coin-data.json");
    const coins = await staticResponse.json();
    const coinStatic = coins.find(c =>
      c.id === coinId ||
      c.name.toLowerCase().replace(/\s+/g, "") === coinId.replace(/-/g, "")
    );

    if (!coinStatic) {
      alert("Coin not found!");
      window.location.href = "index.html";
      return;
    }

// --- BADGE CONFIGURATIE (bovenaan je file) ---
// De zes badge‑keys in de juiste volgorde:
const badgeKeys = [
  "innovative",
  "top1",
  "top5",
  "top10",
  "topperformer",
  "verify"
];
// Human-readable labels for tooltip/title:
const badgeLabels = {
  innovative:   "Innovative Project – Recognized for unique ideas or technology",
  top1:         "Top 1 Community Favorite – #1 based on community votes",
  top5:         "Top 5 Community Favorite – Ranked among the top 5 by the community",
  top10:        "Top 10 Community Favorite – Ranked among the top 10 by the community",
  topperformer: "Performance Badge – High momentum and strong growth",
  verify:       "Verified – Officially reviewed and approved by the Nodalis team"
};


// … in fetchCoinDetails(), na het instellen van coinStatic.* velden …
const badgeContainer = document.getElementById("coin-badges");
badgeContainer.innerHTML = "";  // clear

// pak de array uit je JSON, of een lege array als ‘badges’ niet bestaat
const badges = Array.isArray(coinStatic.badges) ? coinStatic.badges : [];

// loop over je 6 keys, toon pad of blanco.png
badgeKeys.forEach((key, idx) => {
  const wrapper = document.createElement("div");
  wrapper.className = "badge-wrapper";
  wrapper.setAttribute("data-label", badgeLabels[key]);

  const img = document.createElement("img");
  img.src = badges[idx] || "./assets/UI/badges/blanco.png";
  img.alt = badgeLabels[key];
  img.className = "badge";

  wrapper.appendChild(img);
  badgeContainer.appendChild(wrapper);
});



    // Vul de statische gegevens in de pagina
    document.getElementById("coin-icon").src = coinStatic.icon;
    document.getElementById("coin-icon-header").src = coinStatic.icon;

    document.getElementById("coin-name").textContent = coinStatic.name;
    document.getElementById("coin-description").textContent = coinStatic.description;

    // Contract tonen en copy-functionaliteit
    const contractElement = document.getElementById("coin-contract");
    contractElement.textContent = `${coinStatic.contract.slice(0, 7)}...${coinStatic.contract.slice(-5)}`;
    contractElement.dataset.fullAddress = coinStatic.contract;
    document.getElementById("copy-icon").addEventListener("click", (event) => {
      const contractAddress = contractElement.dataset.fullAddress;
      navigator.clipboard.writeText(contractAddress)
        .then(() => showNotification("Contract address copied!", event))
        .catch(() => showNotification("Failed to copy address.", event));
    });

    // Vul de standaard links in (statische data)
    document.getElementById("coin-website").innerHTML = `
      <img src="./assets/UI/domain.png" alt="Website Icon" class="icon">
      <a href="${coinStatic.website}" target="_blank">${coinStatic.website}</a>
    `;
    document.getElementById("coin-explorer").innerHTML = `
      <img src="./assets/UI/magnifier.png" alt="Explorer Icon" class="icon">
      <a href="${coinStatic.explorer}" target="_blank">Cronoscan</a>
    `;
    document.getElementById("coin-twitter").innerHTML = `
      <img src="./assets/UI/twitter.png" alt="Twitter Icon" class="icon">
      <a href="${coinStatic.twitter}" target="_blank">Twitter</a>
    `;
    document.getElementById("coin-telegram").innerHTML = `
      <img src="./assets/UI/telegram.png" alt="Telegram Icon" class="icon">
      <a href="${coinStatic.telegram}" target="_blank">Telegram</a>
    `;
    document.getElementById("coin-discord").innerHTML = `
      <img src="./assets/UI/discord.png" alt="Discord Icon" class="icon">
      <a href="${coinStatic.discord}" target="_blank">Discord</a>
    `;

    // Whitepaper en Threads
    if (coinStatic.whitepaper) {
      document.getElementById("coin-whitepaper").innerHTML = `
        <img src="./assets/UI/whitepaper.png" alt="Whitepaper Icon" class="icon">
        <a href="${coinStatic.whitepaper}" target="_blank">Whitepaper</a>
      `;
    } else {
      document.getElementById("coin-whitepaper").innerHTML = "";
    }
    if (coinStatic.threads) {
      document.getElementById("coin-threads").innerHTML = `
        <img src="./assets/UI/threads.png" alt="Threads Icon" class="icon">
        &nbsp;<a href="${coinStatic.threads}" target="_blank">Threads</a>
      `;
    } else {
      document.getElementById("coin-threads").innerHTML = "";
    }

    // Extra links (indien aanwezig)
    if (coinStatic.extraLinks && coinStatic.extraLinks.length > 0) {
      let extraLinksHTML = `<h3><img src="./assets/UI/link.png" alt="Link Icon" class="icon"> Additional Links</h3><ul>`;
      coinStatic.extraLinks.forEach(link => {
        if (link.url && link.name) {
          extraLinksHTML += `<li><a href="${link.url}" target="_blank">${link.name}</a></li>`;
        }
      });
      extraLinksHTML += `</ul>`;
      document.getElementById("coin-extra-links").innerHTML = extraLinksHTML;
    } else {
      document.getElementById("coin-extra-links").innerHTML = "";
    }

    // Haal de dynamische data uit de cache op en voeg deze samen
    await fetchAndMergeDynamicData(coinStatic);

    // Haal coin sentiment votes op (blijft realtime)
    fetchVotes();

    // Haal de NodSecurity data op via de GoPlusLabs API
    fetchNodSecurityData(coinStatic);

  } catch (error) {
    console.error("Error loading coin details:", error);
  }
}

/**
 * Haal de dynamische data (cache) op en werk de pagina bij.
 */
async function fetchAndMergeDynamicData(coinStatic) {
  try {
    const response = await fetch("/data/coinCache.json");
    const cacheData = await response.json();
    let coinCachePairs = cacheData[coinStatic.id];
    if (!Array.isArray(coinCachePairs)) {
      coinCachePairs = [coinCachePairs];
    }
    if (coinCachePairs && coinCachePairs.length > 0) {
      const aggregated = aggregateDynamicData(coinCachePairs);

      document.getElementById("coin-price").textContent = aggregated.price
        ? `$${aggregated.price.toFixed(10)}`
        : "N/A";
      document.getElementById("coin-marketcap").textContent = aggregated.marketCap
        ? `$${aggregated.marketCap.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`
        : "N/A";
      document.getElementById("coin-volume").textContent = aggregated.volume
        ? `$${aggregated.volume.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`
        : "N/A";
      document.getElementById("coin-liquidity").textContent = aggregated.liquidity
        ? `$${aggregated.liquidity.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`
        : "N/A";

      marketData = coinCachePairs;
      renderMarkets(marketData);

      if (coinStatic.contract) {
        embedDexscreenerChart(coinStatic.contract);
      }
    } else {
      document.getElementById("coin-price").textContent = "Loading...";
      document.getElementById("coin-marketcap").textContent = "N/A";
      document.getElementById("coin-volume").textContent = "N/A";
      document.getElementById("coin-liquidity").textContent = "N/A";
      if (coinStatic.contract) {
        embedDexscreenerChart(coinStatic.contract);
      }
    }
  } catch (error) {
    console.error("Error fetching dynamic data from cache:", error);
  }
}

// Functie om de Dexscreener embed te tonen
function embedDexscreenerChart(contractAddress) {
  const wrapper = document.getElementById("price-graph-wrapper");
  if (!wrapper) return;
  wrapper.innerHTML = "";

  const style = document.createElement("style");
  style.textContent = `
    #dexscreener-embed { position: relative; width: 100%; padding-bottom: 125%; }
    @media (min-width: 1400px) { #dexscreener-embed { padding-bottom: 65%; } }
    #dexscreener-embed iframe { position: absolute; width: 100%; height: 100%; top: 0; left: 0; border: 0; }
  `;
  document.head.appendChild(style);

  const div = document.createElement("div");
  div.id = "dexscreener-embed";
  div.innerHTML = `
    <iframe src="https://dexscreener.com/cronos/${contractAddress}?embed=1&loadChartSettings=0&trades=0&info=0&chartLeftToolbar=0&chartDefaultOnMobile=1&chartTheme=dark&theme=dark&chartStyle=0&chartType=usd&interval=1">
    </iframe>
  `;

  wrapper.appendChild(div);
}

// 🔥 Toon een melding op het scherm
function showNotification(message, event = null) {
  alert(message);
  console.warn(message);
}

// Trending vote functie (alleen voor ingelogde gebruikers)
async function submitTrendingVote(event) {
  if (!currentUser) {
    showNotification("❌ You need to log in to vote!", event);
    return;
  }

  try {
    const response = await fetch(`/trending/${coinId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId: currentUser.uid }),
    });

    if (response.status === 429) {
      showNotification("⚠️ You can only vote once every 24 hours for this coin.", event);
      return;
    }

    const data = await response.json();
    showNotification("✅ Your trending vote has been recorded.", event);
  } catch (error) {
    console.error("Error submitting trending vote:", error);
    showNotification("❌ Failed to submit trending vote.", event);
  }
}

// Helper: Bereken het aantal milliseconden tot de volgende UTC-middernacht
function getTimeRemainingForCoinVote() {
  const now = new Date();
  const nextMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return nextMidnight - now > 0 ? nextMidnight - now : 0;
}

// Helper: Formatteer milliseconden naar HH:MM:SS
function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, "0");
  const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

// Update de reset-timer voor coin votes
function updateCoinVoteTimer() {
  const timerEl = document.getElementById("reset-timer");
  if (!timerEl) return;
  timerEl.textContent = `Reset in: ${formatTime(getTimeRemainingForCoinVote())}`;
}

// Controleer of de gebruiker voor deze coin al heeft gestemd (op basis van UTC-datum)
function canVoteCoin() {
  if (!currentUser) {
    return false;
  }

  const lastVote = localStorage.getItem(`coin_vote_${coinId}_${currentUser.uid}`);
  if (!lastVote) return true;

  const lastVoteDate = new Date(lastVote);
  const now = new Date();
  return (
    lastVoteDate.getUTCFullYear() !== now.getUTCFullYear() ||
    lastVoteDate.getUTCMonth() !== now.getUTCMonth() ||
    lastVoteDate.getUTCDate() !== now.getUTCDate()
  );
}

// Verstuur een stem (alleen als gebruiker is ingelogd)
async function submitVote(type, event) {
  if (!currentUser) {
    showNotification("❌ You need to log in to vote!", event);
    return;
  }

  if (!canVoteCoin()) {
    showNotification("⚠️ You have already voted today.", event);
    return;
  }

  try {
    const response = await fetch(`/votes/${coinId}/${type}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId: currentUser.uid }),
    });

    if (response.status === 429) {
      showNotification("⚠️ You can only vote once every 24 hours.", event);
      return;
    }

    const data = await response.json();
    updateSentimentBar({
      positive: Number(data.votes.positive) || 0,
      negative: Number(data.votes.negative) || 0,
    });

    showNotification("✅ Your vote has been recorded.", event);
    localStorage.setItem(`coin_vote_${coinId}_${currentUser.uid}`, new Date().toISOString());
  } catch (error) {
    console.error("Error submitting coin vote:", error);
    showNotification("❌ Failed to submit vote.", event);
  }
}

// Haal de coin votes op en update de UI
async function fetchVotes() {
  try {
    const response = await fetch(`/votes/${coinId}`);
    if (!response.ok) throw new Error("Network error");

    const data = await response.json();
    updateSentimentBar({
      positive: Number(data.votes?.positive) || 0,
      negative: Number(data.votes?.negative) || 0,
    });
  } catch (error) {
    console.error("Fout bij ophalen van stemmen:", error);
    updateSentimentBar({ positive: 0, negative: 0 });
  }
}

// Update de sentimentbalk en het totaal aantal stemmen
function updateSentimentBar(votes) {
  const totalVotes = votes.positive + votes.negative;
  const positivePercentage = totalVotes > 0 ? ((votes.positive / totalVotes) * 100).toFixed(1) : 50;
  const negativePercentage = totalVotes > 0 ? ((votes.negative / totalVotes) * 100).toFixed(1) : 50;

  document.getElementById("positive-bar").style.width = `${positivePercentage}%`;
  document.getElementById("positive-bar").textContent = totalVotes > 0 ? `${positivePercentage}%` : "0%";

  document.getElementById("negative-bar").style.width = `${negativePercentage}%`;
  document.getElementById("negative-bar").textContent = totalVotes > 0 ? `${negativePercentage}%` : "0%";

  const totalVotesEl = document.getElementById("total-votes");
  if (totalVotesEl) {
    totalVotesEl.textContent = `Total Votes: ${totalVotes}`;
  }
}

// Koppel event listeners aan de stem-iconen
document.getElementById("vote-positive").addEventListener("click", (event) => submitVote("positive", event));
document.getElementById("vote-negative").addEventListener("click", (event) => submitVote("negative", event));

// Na het laden van de DOM
document.addEventListener("DOMContentLoaded", () => {
  fetchCoinDetails();
  fetchVotes();
  setInterval(updateCoinVoteTimer, 1000);
  setInterval(fetchVotes, 10000);

  // Koppel de trending stemknop indien aanwezig
  const trendingBtn = document.getElementById("vote-trending");
  if (trendingBtn) {
    trendingBtn.addEventListener("click", submitTrendingVote);
  }
  
  // Aangepaste toggle-logica voor de NodSecurity-sectie
  const nodSecuritySection = document.querySelector(".nodsecurity-section");
  const nodSecurityHeader = document.querySelector(".nodsecurity-header");
  const nodSecurityContent = document.querySelector(".nodsecurity-content");
  
  if (nodSecurityHeader && nodSecurityContent && nodSecuritySection) {
    nodSecurityContent.style.display = "none";
    nodSecurityHeader.addEventListener("click", function() {
      nodSecuritySection.classList.toggle("open");
      nodSecurityContent.style.display = nodSecuritySection.classList.contains("open") ? "block" : "none";
    });
  }
});

/* ===================== */
/* NodSecurity Integratie via GoPlusLabs API  */
/* ===================== */

/**
 * Haal de NodSecurity data op van de GoPlusLabs API.
 */
async function fetchNodSecurityData(coinStatic) {
  if (!coinStatic.contract) return;
  const contractAddress = coinStatic.contract.toLowerCase();
  const apiUrl = `https://api.gopluslabs.io/api/v1/token_security/25?contract_addresses=${contractAddress}`;
  try {
    const response = await fetch(apiUrl);
    const data = await response.json();
    renderNodSecurityData(data, contractAddress);
  } catch (error) {
    console.error("Error fetching NodSecurity data:", error);
    document.getElementById("nodsecurity-info").textContent = "Failed to load token security data.";
  }
}

/**
 * Helper: Geeft het standaard icoon-URL terug voor een gegeven veld en waarde.
 */
function getIconForField(field, value) {
  if (field === "Is anti whale") {
    return "./assets/UI/warning.png";
  }

  const noExpectedFields = [
    "Tax modifiable", "External call", "Hidden owner", "Honeypot", "Proxy contract", 
    "Mintable", "Transfer pausable", "Trading cooldown", "Can't sell all", 
    "Owner can change balance", "Has blacklist", "Has whitelist"
  ];
  if (noExpectedFields.includes(field)) {
    return value === "No" ? "./assets/UI/shield.png" : "./assets/UI/delete.png";
  }

  const yesExpectedFields = ["Ownership renounced", "Open source"];
  if (yesExpectedFields.includes(field)) {
    return value === "Yes" ? "./assets/UI/shield.png" : "./assets/UI/delete.png";
  }

  return "./assets/UI/about.png";
}

/**
 * Render de NodSecurity data in de UI.
 */
function renderNodSecurityData(apiResponse, contractAddress) {
  const infoEl = document.getElementById("nodsecurity-info");
  if (apiResponse.code !== 1) {
    infoEl.textContent = "Token security data not available.";
    return;
  }

  const result = apiResponse.result[contractAddress];
  if (!result) {
    infoEl.textContent = "No data for this token.";
    return;
  }

  const yesNo = (val) => val === "1" ? "Yes" : "No";

  const ownershipRenounced = (result.owner_address.toLowerCase() === "0x0000000000000000000000000000000000000000" &&
                              result.can_take_back_ownership === "0")
                              ? "Yes" : "No";

  const creatorBalance = parseFloat(result.creator_balance);
  const creatorBalanceFormatted = isNaN(creatorBalance)
    ? "N/A"
    : `${(creatorBalance / 1e6).toFixed(2)}M (${(parseFloat(result.creator_percent) * 100).toFixed(2)}%)`;

  let html = "<ul style='list-style:none; padding:0;'>";

  function addTaxItem(label, value, buyTaxValue = null) {
    let iconUrl;
    const tax = parseFloat(value);

    if (label === "Buy tax") {
      iconUrl = tax === 0 ? "./assets/UI/shield.png" : "./assets/UI/warning.png";
    } else if (label === "Sell tax") {
      if (tax === 0) {
        iconUrl = "./assets/UI/shield.png";
      } else {
        const buyTax = parseFloat(buyTaxValue) || 0;
        iconUrl = (tax - buyTax) >= 1 ? "./assets/UI/delete.png" : "./assets/UI/warning.png";
      }
    }

    html += `<li style="margin-bottom:5px;">
          <img src="${iconUrl}" style="width:16px; vertical-align:middle; margin-right:5px;">
          <strong>${label}:</strong> ${value}%
          </li>`;
  }

  addTaxItem("Buy tax", result.buy_tax);
  addTaxItem("Sell tax", result.sell_tax, result.buy_tax);

  function addItem(label, value) {
    const iconUrl = getIconForField(label, value);
    html += `<li style="margin-bottom:5px;">
      <img src="${iconUrl}" style="width:16px; vertical-align:middle; margin-right:5px;">
      <strong>${label}:</strong> ${value}
    </li>`;
  }

  addItem("Tax modifiable", yesNo(result.slippage_modifiable) === "Yes" ? "Yes" : "No");
  addItem("External call", yesNo(result.external_call));
  addItem("Ownership renounced", ownershipRenounced);
  addItem("Hidden owner", yesNo(result.hidden_owner));
  addItem("Open source", yesNo(result.is_open_source));
  addItem("Honeypot", yesNo(result.is_honeypot));
  addItem("Proxy contract", yesNo(result.is_proxy));
  addItem("Mintable", yesNo(result.is_mintable));
  addItem("Transfer pausable", yesNo(result.transfer_pausable));
  addItem("Trading cooldown", yesNo(result.trading_cooldown));
  addItem("Can't sell all", yesNo(result.cannot_sell_all));
  addItem("Owner can change balance", parseFloat(result.owner_change_balance) > 0 ? "Yes" : "No");
  addItem("Has blacklist", yesNo(result.is_blacklisted));
  addItem("Has whitelist", yesNo(result.is_whitelisted));
  addItem("Is anti whale", yesNo(result.is_anti_whale));

  html += `<li style="margin-bottom:5px;">
             <img src="./assets/UI/about.png" style="width:16px; vertical-align:middle; margin-right:5px;">
             <strong>Holder count:</strong> ${result.holder_count}
           </li>`;
  html += `<li style="margin-bottom:5px;">
             <img src="./assets/UI/about.png" style="width:16px; vertical-align:middle; margin-right:5px;">
             <strong>LP Holder count:</strong> ${result.lp_holder_count}
           </li>`;
  html += `<li style="margin-bottom:5px;">
             <img src="./assets/UI/about.png" style="width:16px; vertical-align:middle; margin-right:5px;">
             <strong>Creator address:</strong> ${result.creator_address}
           </li>`;
  html += `<li style="margin-bottom:5px;">
             <img src="./assets/UI/about.png" style="width:16px; vertical-align:middle; margin-right:5px;">
             <strong>Creator balance:</strong> ${creatorBalanceFormatted}
           </li>`;
  html += `<li style="margin-bottom:5px;">
             <img src="./assets/UI/about.png" style="width:16px; vertical-align:middle; margin-right:5px;">
             <strong>Owner address:</strong> ${result.owner_address}
           </li>`;
  html += `<li style="margin-bottom:5px;">
             <img src="./assets/UI/about.png" style="width:16px; vertical-align:middle; margin-right:5px;">
             <strong>Owner balance:</strong> ${result.owner_balance}
           </li>`;

  html += "</ul>";

  document.getElementById("nodsecurity-info").innerHTML = html;
}

