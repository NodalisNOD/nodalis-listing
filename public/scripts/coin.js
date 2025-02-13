// fetch the coin details
const params = new URLSearchParams(window.location.search);
let coinId = params.get("id");

if (coinId) {
  coinId = coinId.toLowerCase().replace(/\s+/g, "-");
} else {
  alert("No coin selected!");
  window.location.href = "index.html";
}

let currentPage = 1;
let marketData = [];
let totalLiquidity = 0;

const dexIcons = {
  vvs: { icon: "./assets/vvs.jpg", name: "VVS Finance" },
  "vvs-v3": { icon: "./assets/vvs.jpg", name: "VVS Finance" },
  mm_finance: { icon: "./assets/mmf.jpg", name: "MM Finance" },
  "ebisus-bay": { icon: "./assets/ebisus.png", name: "Ebisus Bay" },
  crodex: { icon: "./assets/crodex.png", name: "Crodex" },
};


async function fetchCoinDetails() {
  try {
    const response = await fetch("/data/coin-data.json");
    const coins = await response.json();
    const coin = coins.find((c) => c.id === coinId);

    if (!coin) {
      alert("Coin not found!");
      window.location.href = "index.html";
      return;
    }

    document.getElementById("coin-icon").src = coin.icon;
    document.getElementById("coin-name").textContent = coin.name;
    document.getElementById("coin-description").textContent = coin.description;

    const contractElement = document.getElementById("coin-contract");
    contractElement.textContent = `${coin.contract.slice(0, 7)}...${coin.contract.slice(-5)}`;
    contractElement.dataset.fullAddress = coin.contract;

    document.getElementById("copy-icon").addEventListener("click", (event) => {
      const contractAddress = document.getElementById("coin-contract").dataset.fullAddress;
      navigator.clipboard.writeText(contractAddress).then(() => {
        showNotification("Contract address copied!", event);
      }).catch(() => {
        showNotification("Failed to copy address.", event);
      });
    });

    document.getElementById("coin-website").innerHTML = `
      <img src="./assets/domain.png" alt="Website Icon" class="icon">
      <a href="${coin.website}" target="_blank">${coin.website}</a>
    `;
    document.getElementById("coin-explorer").innerHTML = `
      <img src="./assets/magnifier.png" alt="Explorer Icon" class="icon">
      <a href="${coin.explorer}" target="_blank">Cronoscan</a>
    `;
    document.getElementById("coin-twitter").innerHTML = `
      <img src="./assets/twitter.png" alt="Twitter Icon" class="icon">
      <a href="${coin.twitter}" target="_blank">Twitter</a>
    `;
    document.getElementById("coin-telegram").innerHTML = `
      <img src="./assets/telegram.png" alt="Telegram Icon" class="icon">
      <a href="${coin.telegram}" target="_blank">Telegram</a>
    `;
    document.getElementById("coin-discord").innerHTML = `
      <img src="./assets/discord.png" alt="Discord Icon" class="icon">
      <a href="${coin.discord}" target="_blank">Discord</a>
    `;

    await fetchDynamicData(coin.dynamicData);
    fetchVotes();
  } catch (error) {
    console.error("Error loading coin details:", error);
  }
}

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

async function fetchDynamicData(dynamicData) {
  try {
    const priceResponse = await fetch(dynamicData.priceApi);
    const priceData = await priceResponse.json();
    const price = parseFloat(priceData.data.attributes.token_prices[Object.keys(priceData.data.attributes.token_prices)[0]]);
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

    // Haal icon en naam op uit dexIcons object
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


async function fetchVotes() {
  try {
    const response = await fetch(`/votes/${coinId}`);
    const votes = await response.json();
    updateSentimentBar(votes);
  } catch (error) {
    console.error("Error fetching votes:", error);
  }
}

async function submitVote(type, event) {
  try {
    const response = await fetch(`/votes/${coinId}/${type}`, { method: "POST" });
    if (response.status === 429) {
      showNotification("You can only vote once every 24 hours.", event);
      return;
    }
    const data = await response.json();
    updateSentimentBar(data.votes);
    showNotification("Your vote has been recorded.", event);
  } catch (error) {
    console.error("Error submitting vote:", error);
    showNotification("Failed to submit vote.", event);
  }
}

function updateSentimentBar(votes) {
  const totalVotes = votes.positive + votes.negative;
  if (totalVotes === 0) return;

  const positivePercentage = ((votes.positive / totalVotes) * 100).toFixed(1);
  const negativePercentage = ((votes.negative / totalVotes) * 100).toFixed(1);

  document.getElementById("positive-bar").style.width = `${positivePercentage}%`;
  document.getElementById("positive-bar").textContent = `${positivePercentage}%`;
  document.getElementById("negative-bar").style.width = `${negativePercentage}%`;
  document.getElementById("negative-bar").textContent = `${negativePercentage}%`;
}

document.getElementById("vote-positive").addEventListener("click", (event) => submitVote("positive", event));
document.getElementById("vote-negative").addEventListener("click", (event) => submitVote("negative", event));

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

document.addEventListener("DOMContentLoaded", fetchCoinDetails);
