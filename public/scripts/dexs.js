// **Functie om exchanges uit JSON te laden en weer te geven**
async function fetchAndDisplayExchanges() {
  try {
      // Load exchanges.json
      let response = await fetch('data/exchanges.json');
      let exchanges = await response.json();

      // **BTC prijs ophalen via proxy**
      let btcPriceResponse = await fetch('/api/coingecko/btcprice');
      let btcPriceData = await btcPriceResponse.json();
      let btcToUsd = btcPriceData?.bitcoin?.usd || 0;

      if (!btcToUsd) {
          console.warn("BTC prijs data ontbreekt of is niet correct geladen.");
      }

      // **Tabel ophalen**
      let exchangeTable = document.getElementById('exchange-table');
      exchangeTable.innerHTML = ""; // Reset de tabel voordat nieuwe data wordt geladen

      exchanges.forEach(async (exchange) => {
          try {
              // **API-gegevens ophalen via de link in exchanges.json**
              let apiResponse = await fetch(exchange.api_links.apiMain);
              let apiData = await apiResponse.json();

              // **24h Volume omzetten naar USD**
              let tradeVolumeBtc = apiData.trade_volume_24h_btc || 0;
              let tradeVolumeUsd = (tradeVolumeBtc * btcToUsd).toFixed(2);

              // **Tabelrij aanmaken**
              let row = document.createElement('tr');

              row.innerHTML = `
                  <td>
                      <a href="exchange.html?id=${exchange.id}" class="no-underline">
                          <img src="${apiData.image}" class="exchange-icon">
                          ${exchange.name}
                      </a>
                  </td>
                  <td>$${tradeVolumeUsd}</td>
                  <td>${apiData.pairs || 'N/A'}</td>
              `;

              exchangeTable.appendChild(row);
          } catch (apiError) {
              console.error(`Fout bij ophalen van API data voor ${exchange.name}:`, apiError);
          }
      });

  } catch (error) {
      console.error("Fout bij laden van exchanges.json:", error);
  }
}

// **Functie om exchange details op te halen en weer te geven op de exchange pagina**
async function loadExchangeFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  const exchangeId = urlParams.get("id");

  if (!exchangeId) {
      console.error("Geen exchange ID gevonden in URL!");
      return;
  }

  try {
      // Load exchanges.json
      let response = await fetch('data/exchanges.json');
      let exchanges = await response.json();

      let exchange = exchanges.find(ex => ex.id === exchangeId);
      if (!exchange) {
          console.error("Exchange niet gevonden!");
          return;
      }

      // **API-gegevens ophalen**
      let apiResponse = await fetch(exchange.api_links.apiMain);
      let apiData = await apiResponse.json();

      // **BTC prijs ophalen via proxy**
      let btcPriceResponse = await fetch('/api/coingecko/btcprice');
      let btcPriceData = await btcPriceResponse.json();
      let btcToUsd = btcPriceData?.bitcoin?.usd || 0;

      if (!btcToUsd) {
          console.warn("BTC prijs data ontbreekt of is niet correct geladen.");
      }

      // **24h Volume berekenen**
      let tradeVolumeBtc = apiData.trade_volume_24h_btc || 0;
      let tradeVolumeUsd = (tradeVolumeBtc * btcToUsd).toFixed(2);

      // **Pagina vullen met exchange gegevens**
      document.getElementById('exchange-name').textContent = exchange.name;
      document.getElementById('exchange-logo').src = apiData.image;
      document.getElementById('website').innerHTML = `<a href="${exchange.website}" target="_blank">${exchange.website}</a>`;
      document.getElementById('name').textContent = exchange.name;
      document.getElementById('year').textContent = apiData.year_established || 'N/A';
      document.getElementById('description').textContent = exchange.description;
      document.getElementById('pairs').textContent = apiData.pairs || 'N/A';
      document.getElementById('trade-volume').textContent = `$${tradeVolumeUsd}`;

  } catch (error) {
      console.error("Fout bij laden van exchange gegevens:", error);
  }
}

// **Pagina laden zodra de DOM klaar is**
document.addEventListener("DOMContentLoaded", fetchAndDisplayExchanges);
document.addEventListener("DOMContentLoaded", loadExchangeFromURL);
