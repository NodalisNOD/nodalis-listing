import { fetchCoinData, coins } from "./altcoins.js";

// function to populate the Newcomers table
async function populateNewcomersTable() {
  const newcomersTable = document.querySelector("#newcomers-table");

  if (!newcomersTable) {
    console.error("Newcomers table element not found.");
    return;
  }

  const allCoinData = await Promise.all(coins.map(fetchCoinData));
  const validCoinData = allCoinData.filter((data) => data !== null);

  const sortedNewcomers = [...validCoinData].sort(
    (a, b) => new Date(b.addedAt || Date.now()) - new Date(a.addedAt || Date.now())
  );

  newcomersTable.innerHTML = sortedNewcomers
    .slice(0, 5)
    .map(
      (coin, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>
          <img src="${coin.icon}" alt="${coin.name} Logo" class="table-icon">
          ${coin.name}
        </td>
        <td>$${coin.price}</td>
      </tr>
    `
    )
    .join("");
}

// function to populate the Top Gainers table
async function populateTopGainersTable() {
  const topGainersTable = document.querySelector("#top-gainers-table");

  if (!topGainersTable) {
    console.error("Top Gainers table element not found.");
    return;
  }

  const allCoinData = await Promise.all(coins.map(fetchCoinData));
  const validCoinData = allCoinData.filter((data) => data !== null);

  const sortedTopGainers = [...validCoinData].sort(
    (a, b) => parseFloat(b.priceChange24h) - parseFloat(a.priceChange24h)
  );

  topGainersTable.innerHTML = sortedTopGainers
    .slice(0, 5)
    .map((coin, index) => {
      const change = parseFloat(coin.priceChange24h);
      const colorClass = change >= 0 ? "positive-change" : "negative-change";
      return `
      <tr>
        <td>${index + 1}</td>
        <td>
          <img src="${coin.icon}" alt="${coin.name} Logo" class="table-icon">
          ${coin.name}
        </td>
        <td class="${colorClass}">${change}%</td>
      </tr>
    `;
    })
    .join("");
}

// fill the tables when the page loads
document.addEventListener("DOMContentLoaded", () => {
  populateNewcomersTable();
  populateTopGainersTable();
});
