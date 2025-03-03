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
  "candycity_finance": { icon: "./assets/UI/candycity.png", name: "Candy City" },
};

// Aggregatie van dynamische data uit de cache (verzamelt waarden over meerdere paren)
function aggregateDynamicData(pairs) {
  let totalVolume = 0;
  let totalLiquidity = 0;
  let weightedPriceSum = 0;
  let totalMarketCap = 0;
  
  pairs.forEach(pair => {
    const vol = parseFloat(pair.volume?.h24) || 0;
    const liq = parseFloat(pair.liquidity?.usd) || 0;
    const price = parseFloat(pair.priceUsd) || 0;
    const mc = parseFloat(pair.marketCap) || 0;
    
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

// Haal de statische coin data op én voeg hieraan de dynamische cache-gegevens toe
async function fetchCoinDetails() {
  try {
    // Eerst de statische coin-data laden
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
    
    // Contract tonen en copy functionaliteit
    const contractElement = document.getElementById("coin-contract");
    contractElement.textContent = `${coinStatic.contract.slice(0, 7)}...${coinStatic.contract.slice(-5)}`;
    contractElement.dataset.fullAddress = coinStatic.contract;
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
    
    // Nu de dynamische data uit de cache ophalen
    await fetchAndMergeDynamicData(coinStatic);
    
    // Haal coin sentiment votes op (blijft realtime)
    fetchVotes();
    
  } catch (error) {
    console.error("Error loading coin details:", error);
  }
}

// Haal de dynamische data (cache) op en werk de pagina bij
async function fetchAndMergeDynamicData(coinStatic) {
  try {
    const response = await fetch("/data/coinCache.json");
    const cacheData = await response.json();
    // De cache is een object met keys als coin id, en waarden als arrays van paren
    const coinCachePairs = cacheData[coinStatic.id];
    if (coinCachePairs && coinCachePairs.length > 0) {
      const aggregated = aggregateDynamicData(coinCachePairs);
      
      // Update de dynamische elementen
      if (aggregated.price) {
        document.getElementById("coin-price").textContent = `$${aggregated.price.toFixed(10)}`;
      } else {
        document.getElementById("coin-price").textContent = "N/A";
      }
      if (aggregated.marketCap) {
        document.getElementById("coin-marketcap").textContent = `$${aggregated.marketCap.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
      } else {
        document.getElementById("coin-marketcap").textContent = "N/A";
      }
      if (aggregated.volume) {
        document.getElementById("coin-volume").textContent = `$${aggregated.volume.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
      } else {
        document.getElementById("coin-volume").textContent = "N/A";
      }
      if (aggregated.liquidity) {
        document.getElementById("coin-liquidity").textContent = `$${aggregated.liquidity.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
      } else {
        document.getElementById("coin-liquidity").textContent = "N/A";
      }
      
      // Indien er markten worden meegegeven in de cache, update deze
      // Bijvoorbeeld, als je de array zelf wilt tonen:
      if (coinCachePairs[0].marketApi) {
        marketData = coinCachePairs;
        renderMarkets(marketData);
      }
      
      // Voor grafiekdata: als de cache grafiekdata bevat (bijvoorbeeld als onderdeel van de cache) gebruik deze
      if (coinStatic.graphData) {
        renderGraphFromCache(coinStatic.graphData);
      } else if (coinStatic.dynamicData && coinStatic.dynamicData.graphApi) {
        // Fallback: gebruik de oude graph API uit coin-data.json
        renderGraph(coinStatic.dynamicData.graphApi);
      }
    } else {
      // Geen cache gevonden, gebruik fallback via de dynamicData uit coin-data.json
      if (coinStatic.dynamicData && coinStatic.dynamicData.priceApi) {
        // Je zou hier eventueel een aparte fetchDynamicData() functie kunnen aanroepen.
        // Voor nu tonen we "Loading..." of N/A.
        document.getElementById("coin-price").textContent = "Loading...";
        document.getElementById("coin-marketcap").textContent = "N/A";
        document.getElementById("coin-volume").textContent = "N/A";
        document.getElementById("coin-liquidity").textContent = "N/A";
        
        // Grafiek fallback
        if (coinStatic.dynamicData.graphApi) {
          renderGraph(coinStatic.dynamicData.graphApi);
        }
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
    const { labels, prices } = graphData; // Verwacht dat deze arrays aanwezig zijn
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
    const votes = await response.json();
    const positiveVotes = Number(votes.positive) || 0;
    const negativeVotes = Number(votes.negative) || 0;
    updateSentimentBar({ positive: positiveVotes, negative: negativeVotes });
  } catch (error) {
    console.error("Error fetching coin votes:", error);
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
  const positivePercentage = totalVotes > 0 ? ((positiveVotes / totalVotes) * 100).toFixed(1) : 0;
  const negativePercentage = totalVotes > 0 ? ((negativeVotes / totalVotes) * 100).toFixed(1) : 0;
  
  const positiveBar = document.getElementById("positive-bar");
  const negativeBar = document.getElementById("negative-bar");
  positiveBar.style.width = `${positivePercentage}%`;
  positiveBar.textContent = totalVotes > 0 ? `${positivePercentage}%` : "0%";
  negativeBar.style.width = `${negativePercentage}%`;
  negativeBar.textContent = totalVotes > 0 ? `${negativePercentage}%` : "0%";
  
  const totalVotesEl = document.getElementById("total-votes");
  if (totalVotesEl) {
    totalVotesEl.textContent = `Votes: ${totalVotes}`;
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
