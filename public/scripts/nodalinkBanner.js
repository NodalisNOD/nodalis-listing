document.addEventListener("DOMContentLoaded", async function() {
  let linkedUsersCount = 0;
  let tokensCount = 0;
  let exchangesCount = 0;

  // Laad links.json voor het aantal gekoppelde gebruikers
  try {
    const linksResponse = await fetch("/data/links.json");
    if (!linksResponse.ok) {
      throw new Error("Failed to load links.json");
    }
    const linksData = await linksResponse.json();
    // Als linksData een array is, gebruik de lengte; anders, tel de keys
    linkedUsersCount = Array.isArray(linksData)
      ? linksData.length
      : Object.keys(linksData).length;
  } catch (err) {
    console.error("Error loading links.json:", err);
  }

  // Laad coinCache.json voor het aantal tokens
  try {
    const coinResponse = await fetch("/data/coinCache.json");
    if (!coinResponse.ok) {
      throw new Error("Failed to load coinCache.json");
    }
    const coinData = await coinResponse.json();
    tokensCount = Object.keys(coinData).length;
  } catch (err) {
    console.error("Error loading coinCache.json:", err);
  }

  // Laad exchangeCache.json voor het aantal exchanges
  try {
    const exchResponse = await fetch("/data/exchangeCache.json");
    if (!exchResponse.ok) {
      throw new Error("Failed to load exchangeCache.json");
    }
    const exchData = await exchResponse.json();
    exchangesCount = Object.keys(exchData).length;
  } catch (err) {
    console.error("Error loading exchangeCache.json:", err);
  }

  // Maak de NodaLink banner aan met de opgehaalde data zonder inline styles
  const banner = document.createElement("div");
  banner.id = "nodalinkBanner";
  banner.innerHTML = `
    <div class="banner-item">Linked Users: <strong>${linkedUsersCount}</strong></div>
    <div class="banner-item">
      <a href="index.html">
        Tokens: <strong>${tokensCount}</strong>
      </a>
    </div>
    <div class="banner-item">
      <a href="dexs.html">
        Exchanges: <strong>${exchangesCount}</strong>
      </a>
    </div>
  `;

  // Voeg de banner direct na de header toe
  const header = document.getElementById("header");
  if (header) {
    header.insertAdjacentElement("afterend", banner);
  } else {
    console.error("Header element not found!");
  }
});
