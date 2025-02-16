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

// Globale variabelen voor de coin details
let currentPage = 1;
let marketData = [];
let totalLiquidity = 0;

// Dex icon mapping voor markten
const dexIcons = {
  vvs: { icon: "./assets/coinIcons/vvs.jpg", name: "VVS Finance" },
  "vvs-v3": { icon: "./assets/coinIcons/vvs.jpg", name: "VVS Finance" },
  mm_finance: { icon: "./assets/coinIcons/mmf.jpg", name: "MM Finance" },
  "ebisus-bay": { icon: "./assets/coinIcons/ebisus.png", name: "Ebisus Bay" },
  crodex: { icon: "./assets/coinIcons/crx.png", name: "Crodex" },
  cronaswap: { icon: "./assets/coinIcons/crona.jpg", name: "CronaSwap" },
  "phenix-finance-cronos": { icon: "./assets/coinIcons/phenix.webp", name: "PhenixFinance" },
};

// Haal coin details op
async function fetchCoinDetails() {
  try {
    const response = await fetch("/data/coin-data.json");
    const coins = await response.json();

    const coin = coins.find((c) =>
      c.id === coinId ||
      c.name.toLowerCase().replace(/\s+/g, "") === coinId.replace(/-/g, "")
    );

    if (!coin) {
      alert("Coin not found!");
      window.location.href = "index.html";
      return;
    }

    // Vul de coin details in de pagina
    document.getElementById("coin-icon").src = coin.icon;
    document.getElementById("coin-name").textContent = coin.name;
    document.getElementById("coin-description").textContent = coin.description;

    // Contract: toon een afgekorte versie en koppel copy-functionaliteit
    const contractElement = document.getElementById("coin-contract");
    contractElement.textContent = `${coin.contract.slice(0, 7)}...${coin.contract.slice(-5)}`;
    contractElement.dataset.fullAddress = coin.contract;

    document.getElementById("copy-icon").addEventListener("click", (event) => {
      const contractAddress = contractElement.dataset.fullAddress;
      navigator.clipboard.writeText(contractAddress)
        .then(() => {
          showNotification("Contract address copied!", event);
        })
        .catch(() => {
          showNotification("Failed to copy address.", event);
        });
    });

    // Vul de standaard links in
    document.getElementById("coin-website").innerHTML = `
      <img src="./assets/UI/domain.png" alt="Website Icon" class="icon">
      <a href="${coin.website}" target="_blank">${coin.website}</a>
    `;
    document.getElementById("coin-explorer").innerHTML = `
      <img src="./assets/UI/magnifier.png" alt="Explorer Icon" class="icon">
      <a href="${coin.explorer}" target="_blank">Cronoscan</a>
    `;
    document.getElementById("coin-twitter").innerHTML = `
      <img src="./assets/UI/twitter.png" alt="Twitter Icon" class="icon">
      <a href="${coin.twitter}" target="_blank">Twitter</a>
    `;
    document.getElementById("coin-telegram").innerHTML = `
      <img src="./assets/UI/telegram.png" alt="Telegram Icon" class="icon">
      <a href="${coin.telegram}" target="_blank">Telegram</a>
    `;
    document.getElementById("coin-discord").innerHTML = `
      <img src="./assets/UI/discord.png" alt="Discord Icon" class="icon">
      <a href="${coin.discord}" target="_blank">Discord</a>
    `;

// Nieuwe links: Whitepaper en Threads
if (coin.whitepaper) {
  document.getElementById("coin-whitepaper").innerHTML = `
    <img src="./assets/UI/whitepaper.png" alt="Whitepaper Icon" class="icon">
    <a href="${coin.whitepaper}" target="_blank">Whitepaper</a>
  `;
} else {
  document.getElementById("coin-whitepaper").innerHTML = "";
}

if (coin.threads) {
  document.getElementById("coin-threads").innerHTML = `
    <img src="./assets/UI/threads.png" alt="Threads Icon" class="icon">
    &nbsp;<a href="${coin.threads}" target="_blank">Threads</a>
  `;
} else {
  document.getElementById("coin-threads").innerHTML = "";
}

    // Extra links (maximaal 3) tonen als ze ingevuld zijn
    if (coin.extraLinks && coin.extraLinks.length > 0) {
      let extraLinksHTML = `<h3><img src="./assets/UI/link.png" alt="Link Icon" class="icon"> Additional Links</h3><ul>`;
      coin.extraLinks.forEach(link => {
        if (link.url && link.name) {
          extraLinksHTML += `<li><a href="${link.url}" target="_blank">${link.name}</a></li>`;
        }
      });
      extraLinksHTML += `</ul>`;
      document.getElementById("coin-extra-links").innerHTML = extraLinksHTML;
    } else {
      document.getElementById("coin-extra-links").innerHTML = "";
    }

    await fetchDynamicData(coin.dynamicData);
    fetchVotes(); // Haal de permanente coin sentiment votes op
  } catch (error) {
    console.error("Error loading coin details:", error);
  }
}

// Toon een notificatie (bijv. voor kopiëren of stemmen)
function showNotification(message, event) {
  const popup = document.getElementById("notification-popup");
  popup.textContent = message;
  const xOffset = 20;
  const yOffset = 20;
  popup.style.left = `${event.pageX + xOffset}px`;
  popup.style.top = `${event.pageY + yOffset}px`;
  popup.classList.remove("hidden");
  popup.classList.add("visible");
  setTimeout(() => {
    popup.classList.remove("visible");
    popup.classList.add("hidden");
  }, 2000);
}
async function submitTrendingVote() {
  try {
    const response = await fetch(`/trending/${coinId}`, { method: 'POST' });
    if (response.status === 429) {
      alert("You can only vote once every 24 hours for this coin.");
      return;
    }
    const data = await response.json();
    alert("Your trending vote has been recorded.");
    // (Optioneel) Update de UI met het nieuwe aantal stemmen
  } catch (error) {
    console.error("Error submitting trending vote:", error);
    alert("Failed to submit trending vote.");
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const trendingBtn = document.getElementById("vote-trending");
  if (trendingBtn) {
    trendingBtn.addEventListener("click", submitTrendingVote);
  }
});


// Haal dynamische coin data (prijs, markten, grafiek, etc.) op
async function fetchDynamicData(dynamicData) {
  try {
    const priceResponse = await fetch(dynamicData.priceApi);
    const priceData = await priceResponse.json();
    const price = parseFloat(priceData.data.attributes.token_prices[
      Object.keys(priceData.data.attributes.token_prices)[0]
    ]);
    document.getElementById("coin-price").textContent = `$${price.toFixed(10)}`;

    const marketResponse = await fetch(dynamicData.marketApi);
    const marketApiData = await marketResponse.json();
    marketData = marketApiData.data;

    let totalMarketCap = null;
    let totalVolume24h = 0;

    marketData.forEach((market) => {
      const attributes = market.attributes;
      if (!totalMarketCap) {
        if (attributes.market_cap_usd) {
          totalMarketCap = parseFloat(attributes.market_cap_usd);
        } else if (attributes.fdv_usd) {
          totalMarketCap = parseFloat(attributes.fdv_usd);
        } else if (attributes.reserve_in_usd && attributes.base_token_price_usd) {
          const reserveUsd = parseFloat(attributes.reserve_in_usd);
          const baseTokenPrice = parseFloat(attributes.base_token_price_usd);
          totalMarketCap = reserveUsd / baseTokenPrice;
        }
      }
      totalVolume24h += parseFloat(attributes.volume_usd?.h24) || 0;
      totalLiquidity += parseFloat(attributes.reserve_in_usd) || 0;
    });

    document.getElementById("coin-marketcap").textContent = totalMarketCap
      ? `$${totalMarketCap.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`
      : "N/A";
    document.getElementById("coin-volume").textContent = `$${totalVolume24h.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
    document.getElementById("coin-liquidity").textContent = `$${totalLiquidity.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;

    renderMarkets(marketData);
    renderGraph(dynamicData.graphApi);
  } catch (error) {
    console.error("Error fetching dynamic data:", error);
  }
}

function renderMarkets(markets) {
  const marketsTable = document.getElementById("markets-table");
  marketsTable.innerHTML = "";
  markets.forEach((market) => {
    const attributes = market.attributes;
    const dex = market.relationships.dex.data.id;
    const dexData = dexIcons[dex] || { icon: "./assets/default.png", name: dex };
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>
        <img src="${dexData.icon}" alt="${dexData.name}" class="dex-icon" width="16" height="16">
        <span>${dexData.name}</span>
      </td>
      <td>${attributes.name}</td>
      <td>$${parseFloat(attributes.base_token_price_usd).toFixed(10)}</td>
      <td>$${parseFloat(attributes.volume_usd.h24).toLocaleString()}</td>
      <td>$${parseFloat(attributes.reserve_in_usd).toLocaleString()}</td>
    `;
    marketsTable.appendChild(row);
  });
}

function renderGraph(graphApi) {
  fetch(graphApi)
    .then((response) => response.json())
    .then((data) => {
      const ctx = document.getElementById("price-graph").getContext("2d");
      const ohlcvList = data.data.attributes.ohlcv_list.reverse();
      const labels = ohlcvList.map((entry) =>
        new Date(entry[0] * 1000).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      );
      const prices = ohlcvList.map((entry) => parseFloat(entry[4]));

      const dataset = {
        label: "Price (USD)",
        data: prices,
        borderColor: "#4caf50",
        borderWidth: 2,
        pointRadius: 1,
        pointHoverRadius: 2,
        pointBackgroundColor: "rgba(255, 255, 255, 0.8)",
        fill: false,
        segment: {
          borderColor: (ctx) => {
            const index = ctx.p1DataIndex;
            return prices[index] > prices[index - 1]
              ? "rgba(0, 200, 0, 1)"
              : "rgb(253, 121, 121)";
          },
        },
      };

      new Chart(ctx, {
        type: "line",
        data: {
          labels: labels,
          datasets: [dataset],
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          aspectRatio: 2,
          scales: {
            x: { display: false },
            y: {
              ticks: {
                callback: (value) => `$${value.toFixed(10)}`,
              },
            },
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (context) => `Price: $${context.raw.toFixed(10)}`,
                title: (context) => context[0].label,
              },
            },
          },
        },
      });
    })
    .catch((error) => console.error("Error rendering graph:", error));
}

/* ===================== */
/* Coin Sentiment Votes  */
/* (Permanente votes per coin met dagelijkse beperking) */
/* ===================== */

// Helper: Berekent het aantal milliseconden tot de volgende UTC-middernacht
function getTimeRemainingForCoinVote() {
  const now = new Date();
  const nextMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  const diff = nextMidnight - now;
  return diff > 0 ? diff : 0;
}

// Helper: Formatteer milliseconden naar HH:MM:SS
function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, "0");
  const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

// Update de reset-timer voor coin votes (weergeven als "Reset in: HH:MM:SS")
function updateCoinVoteTimer() {
  const timerEl = document.getElementById("reset-timer");
  if (!timerEl) return;
  const remaining = getTimeRemainingForCoinVote();
  timerEl.textContent = `Reset in: ${formatTime(remaining)}`;
}

// Controleer of de gebruiker voor deze coin al heeft gestemd (op basis van UTC-datum)
function canVoteCoin() {
  const lastVote = localStorage.getItem(`coin_vote_${coinId}`);
  if (!lastVote) return true;
  const lastVoteDate = new Date(lastVote);
  const now = new Date();
  return (
    lastVoteDate.getUTCFullYear() !== now.getUTCFullYear() ||
    lastVoteDate.getUTCMonth() !== now.getUTCMonth() ||
    lastVoteDate.getUTCDate() !== now.getUTCDate()
  );
}

// Haal de coin votes op (via endpoint /votes/:coinId) en update de sentimentbalk en "Votes:" display
async function fetchVotes() {
  try {
    const response = await fetch(`/votes/${coinId}`);
    const votes = await response.json();
    updateSentimentBar(votes);
  } catch (error) {
    console.error("Error fetching coin votes:", error);
  }
}

// Verstuur een stem voor de coin (alleen 1x per dag per coin)
async function submitVote(type, event) {
  if (!canVoteCoin()) {
    showNotification("You have already voted today.", event);
    return;
  }
  try {
    const response = await fetch(`/votes/${coinId}/${type}`, { method: "POST" });
    if (response.status === 429) {
      showNotification("You can only vote once every 24 hours.", event);
      return;
    }
    const data = await response.json();
    updateSentimentBar(data.votes);
    showNotification("Your vote has been recorded.", event);
    // Sla de stemtijd op voor deze coin
    localStorage.setItem(`coin_vote_${coinId}`, new Date().toISOString());
  } catch (error) {
    console.error("Error submitting coin vote:", error);
    showNotification("Failed to submit vote.", event);
  }
}

// Update de sentimentbalk en de "Votes:" display
function updateSentimentBar(votes) {
  const totalVotes = votes.positive + votes.negative;
  const positivePercentage = totalVotes > 0 ? ((votes.positive / totalVotes) * 100).toFixed(1) : 0;
  const negativePercentage = totalVotes > 0 ? ((votes.negative / totalVotes) * 100).toFixed(1) : 0;

  const positiveBar = document.getElementById("positive-bar");
  const negativeBar = document.getElementById("negative-bar");

  positiveBar.style.width = `${positivePercentage}%`;
  positiveBar.textContent = totalVotes > 0 ? `${positivePercentage}%` : "0%";
  negativeBar.style.width = `${negativePercentage}%`;
  negativeBar.textContent = totalVotes > 0 ? `${negativePercentage}%` : "0%";

  // Update de total votes display (indien element met id "total-votes" aanwezig is)
  const totalVotesEl = document.getElementById("total-votes");
  if (totalVotesEl) {
    totalVotesEl.textContent = `Votes: ${totalVotes}`;
  }
}

// Koppel event listeners aan de vote-iconen voor de coin sentiment votes
document.getElementById("vote-positive").addEventListener("click", (event) => submitVote("positive", event));
document.getElementById("vote-negative").addEventListener("click", (event) => submitVote("negative", event));

// Start: Haal coin details op wanneer de pagina geladen is
document.addEventListener("DOMContentLoaded", () => {
  fetchCoinDetails();
  // Update de reset timer voor coin votes elke seconde
  setInterval(updateCoinVoteTimer, 1000);
});
