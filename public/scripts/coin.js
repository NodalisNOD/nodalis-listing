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
 * Deze functie haalt voor elk pair de naam op; als er geen
 * top-level "name" aanwezig is, wordt de pair-naam samengesteld
 * uit baseToken.symbol en quoteToken.symbol (bijv. "MERY / WCRO").
 */
function renderMarkets(markets) {
  const marketsTable = document.getElementById("markets-table");
  if (!marketsTable) return;
  marketsTable.innerHTML = ""; // Reset de tabel

  markets.forEach((market) => {
    // Gebruik de geneste structuur als deze aanwezig is, anders het object zelf
    const attributes = (market.data && market.data.attributes) ? market.data.attributes : market;
    // Bepaal de dex-ID
    const dex = market.dexId || (market.data && market.data.relationships && market.data.relationships.dex.data.id);
    const dexData = dexIcons[dex] || { icon: "./assets/default.png", name: dex || "Unknown" };

    // Bepaal de pair-naam: als er een top-level "name" bestaat, gebruik dat;
    // anders combineer de symbolen van baseToken en quoteToken.
    let pairName = attributes.name;
    if (!pairName) {
      if (market.baseToken && market.quoteToken) {
        pairName = `${market.baseToken.symbol.trim()} / ${market.quoteToken.symbol.trim()}`;
      } else {
        pairName = "N/A";
      }
    }

    // Haal prijs, volume en liquiditeit op
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
 * Haal de statische coin data op én voeg hieraan de dynamische cache-gegevens toe.
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
    
    // Vul de statische gegevens in de pagina
    document.getElementById("coin-icon").src = coinStatic.icon;
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
    
  } catch (error) {
    console.error("Error loading coin details:", error);
  }
}

/**
 * Haal de dynamische data (cache) op en werk de pagina bij.
 * Deze functie zorgt ervoor dat we werken met een array, ongeacht de vorm van de cache.
 */
async function fetchAndMergeDynamicData(coinStatic) {
  try {
    const response = await fetch("/data/coinCache.json");
    const cacheData = await response.json();
    let coinCachePairs = cacheData[coinStatic.id];
    // Zorg dat we werken met een array
    if (!Array.isArray(coinCachePairs)) {
      coinCachePairs = [coinCachePairs];
    }
    if (coinCachePairs && coinCachePairs.length > 0) {
      const aggregated = aggregateDynamicData(coinCachePairs);
      
      // Update de dynamische elementen op de pagina
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
      
      // Render markten: geef alle pairs weer, zodat je bijvoorbeeld "MERY / WCRO" kunt zien.
      marketData = coinCachePairs;
      renderMarkets(marketData);
      
      // Grafiek: als er statische grafiekdata aanwezig is, gebruik die; anders fallback op dynamicData
      if (coinStatic.graphData) {
        renderGraphFromCache(coinStatic.graphData);
      } else if (coinStatic.dynamicData && coinStatic.dynamicData.graphApi) {
        renderGraph(coinStatic.dynamicData.graphApi);
      }
    } else {
      // Geen cache gevonden: fallback op dynamicData uit coin-data.json
      document.getElementById("coin-price").textContent = "Loading...";
      document.getElementById("coin-marketcap").textContent = "N/A";
      document.getElementById("coin-volume").textContent = "N/A";
      document.getElementById("coin-liquidity").textContent = "N/A";
      if (coinStatic.dynamicData && coinStatic.dynamicData.graphApi) {
        renderGraph(coinStatic.dynamicData.graphApi);
      }
    }
  } catch (error) {
    console.error("Error fetching dynamic data from cache:", error);
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

// Verstuur een trending stem voor de huidige coin
async function submitTrendingVote() {
  try {
    const response = await fetch(`/trending/${coinId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (response.status === 429) {
      alert("You can only vote once every 24 hours for this coin.");
      return;
    }
    const data = await response.json();
    alert("Your trending vote has been recorded.");
  } catch (error) {
    console.error("Error submitting trending vote:", error);
    alert("Failed to submit trending vote.");
  }
}

// Grafiek weergeven vanuit de cache (indien grafiekdata direct beschikbaar is)
function renderGraphFromCache(graphData) {
  try {
    const canvas = document.getElementById("price-graph");
    const ctx = canvas.getContext("2d");
    const { labels, prices } = graphData; // Verwacht arrays
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, 'rgba(0, 123, 255, 0.8)');
    gradient.addColorStop(0.5, 'rgba(0, 123, 255, 0.7)');
    gradient.addColorStop(1, 'rgba(0, 123, 255, 0.3)');
    const dataset = {
      label: "Price (USD)",
      data: prices,
      borderColor: "rgba(0, 123, 255, 1)",
      borderWidth: 2,
      pointRadius: 1,
      pointHoverRadius: 2,
      pointBackgroundColor: "rgba(255, 255, 255, 0.8)",
      fill: true,
      backgroundColor: gradient,
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
  } catch (error) {
    console.error("Error rendering cached graph:", error);
  }
}

// Fallback: Originele grafiek-render functie (wanneer geen cache beschikbaar is)
function renderGraph(graphApi) {
  fetch(graphApi)
    .then((response) => response.json())
    .then((data) => {
      const canvas = document.getElementById("price-graph");
      const ctx = canvas.getContext("2d");
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
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, 'rgba(0, 123, 255, 0.8)');
      gradient.addColorStop(0.5, 'rgba(0, 123, 255, 0.7)');
      gradient.addColorStop(1, 'rgba(0, 123, 255, 0.3)');
      const dataset = {
        label: "Price (USD)",
        data: prices,
        borderColor: "rgba(0, 123, 255, 1)",
        borderWidth: 2,
        pointRadius: 1,
        pointHoverRadius: 2,
        pointBackgroundColor: "rgba(255, 255, 255, 0.8)",
        fill: true,
        backgroundColor: gradient,
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

// Helper: Bereken het aantal milliseconden tot de volgende UTC-middernacht
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

// Update de reset-timer voor coin votes
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

// Haal de coin votes op (via endpoint /votes/:coinId) en update de sentimentbalk en het totaal aantal stemmen
async function fetchVotes() {
  try {
    const response = await fetch(`/votes/${coinId}`);
    if (!response.ok) throw new Error("Network error");
    const data = await response.json();
    
    // Correctie: Gebruik data.votes in plaats van directe toegang
    const positiveVotes = Number(data.votes?.positive) || 0;
    const negativeVotes = Number(data.votes?.negative) || 0;
    
    console.log("Ontvangen stemmen:", { positive: positiveVotes, negative: negativeVotes }); // Debugging
    updateSentimentBar({ positive: positiveVotes, negative: negativeVotes });
  } catch (error) {
    console.error("Fout bij ophalen van stemmen:", error);
    updateSentimentBar({ positive: 0, negative: 0 });
  }
}


// Verstuur een stem voor de coin (1x per dag per coin)
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
    const positiveVotes = Number(data.votes.positive) || 0;
    const negativeVotes = Number(data.votes.negative) || 0;
    updateSentimentBar({ positive: positiveVotes, negative: negativeVotes });
    showNotification("Your vote has been recorded.", event);
    localStorage.setItem(`coin_vote_${coinId}`, new Date().toISOString());
  } catch (error) {
    console.error("Error submitting coin vote:", error);
    showNotification("Failed to submit vote.", event);
  }
}

// Update de sentimentbalk en het totaal aantal stemmen
function updateSentimentBar(votes) {
  const positiveVotes = Number(votes.positive) || 0;
  const negativeVotes = Number(votes.negative) || 0;
  const totalVotes = positiveVotes + negativeVotes;
  const positivePercentage = totalVotes > 0 ? ((positiveVotes / totalVotes) * 100).toFixed(1) : 50; // Default to 50% if no votes
  const negativePercentage = totalVotes > 0 ? ((negativeVotes / totalVotes) * 100).toFixed(1) : 50; // Default to 50% if no votes
  
  const positiveBar = document.getElementById("positive-bar");
  const negativeBar = document.getElementById("negative-bar");
  
  positiveBar.style.width = `${positivePercentage}%`;
  positiveBar.textContent = totalVotes > 0 ? `${positivePercentage}% (${positiveVotes})` : "0% (0)";
  
  negativeBar.style.width = `${negativePercentage}%`;
  negativeBar.textContent = totalVotes > 0 ? `${negativePercentage}% (${negativeVotes})` : "0% (0)";
  
  const totalVotesEl = document.getElementById("total-votes");
  if (totalVotesEl) {
    totalVotesEl.textContent = `Total Votes: ${totalVotes}`;
  }
}

// Koppel event listeners aan de stem-iconen
document.getElementById("vote-positive").addEventListener("click", (event) => submitVote("positive", event));
document.getElementById("vote-negative").addEventListener("click", (event) => submitVote("negative", event));

// Initialisatie: zodra de DOM geladen is, start de functies
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
});
