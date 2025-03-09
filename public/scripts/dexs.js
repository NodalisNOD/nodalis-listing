// scripts/dexs.js

document.addEventListener('DOMContentLoaded', function () {
  // Functie om de BTC/USD-prijs op te halen via CoinGecko
  async function getBTCPrice() {
    const url = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd';
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Netwerk response was niet ok');
      }
      const data = await response.json();
      return data.bitcoin.usd; // BTC/USD-prijs
    } catch (error) {
      console.error('Er is een probleem opgetreden bij het ophalen van de BTC-prijs:', error);
      return null;
    }
  }

  // Functie om de exchanges te laden, waarbij statische info uit exchanges.json komt en dynamische data uit de server-cache (/api/exchanges)
  async function loadExchanges() {
    // Haal eerst de BTC/USD-prijs op
    const btcPrice = await getBTCPrice();
    if (!btcPrice) {
      console.error('Kon BTC-prijs niet ophalen. Stoppen...');
      return;
    }

    // Haal de statische exchange data op (bijvoorbeeld iconen, naam, etc.)
    const staticUrl = './data/exchanges.json';
    let staticExchanges = [];
    try {
      const response = await fetch(staticUrl);
      if (!response.ok) {
        throw new Error('Netwerk response was niet ok');
      }
      staticExchanges = await response.json();
      console.log('Statische exchange data:', staticExchanges);
    } catch (error) {
      console.error('Er is een probleem opgetreden bij het laden van de statische exchanges:', error);
      return;
    }

    // Haal de dynamische exchange data op uit de server-side cache
    let dynamicExchanges = {};
    try {
      const response = await fetch('/api/exchanges');
      if (!response.ok) {
        throw new Error('Netwerk response was niet ok');
      }
      dynamicExchanges = await response.json(); // verwacht een object met keys als exchange id
      console.log('Dynamische exchange cache:', dynamicExchanges);
    } catch (error) {
      console.error('Er is een probleem opgetreden bij het laden van de dynamische exchanges:', error);
      return;
    }

    // Verwijzing naar de tbody van de exchange-tabel
    const tbody = document.getElementById('exchange-table');
    tbody.innerHTML = "";

    // Loop door alle statische exchanges en koppel de dynamische data (indien beschikbaar) op basis van exchange id
    staticExchanges.forEach(exchangeStatic => {
      const dynamicData = dynamicExchanges[exchangeStatic.id] || {};

      // Bouw een nieuwe rij voor deze exchange
      const row = document.createElement('tr');

      // Naam-cell: gebruik icon en naam uit de statische data
      const nameCell = document.createElement('td');
      const container = document.createElement('span');
      container.style.display = 'flex';
      container.style.alignItems = 'center';

      // Zorg dat het icoonpad correct is (als het begint met "public/", verwijderen we dat gedeelte)
      let iconPath = exchangeStatic.icon;
      if (iconPath.startsWith("public/")) {
        iconPath = "/" + iconPath.slice("public/".length);
      }
      const iconImg = document.createElement('img');
      iconImg.src = iconPath;
      iconImg.alt = exchangeStatic.name;
      iconImg.style.width = '20px';
      iconImg.style.height = '20px';
      iconImg.style.marginRight = '5px';
      container.appendChild(iconImg);

      // Maak een link voor de exchange naam (bijvoorbeeld naar een detailpagina)
      const link = document.createElement('a');
      link.href = `detail.html?id=${exchangeStatic.id}`;
      link.textContent = exchangeStatic.name;
      container.appendChild(link);
      nameCell.appendChild(container);
      row.appendChild(nameCell);

      // Volume-cell: Gebruik bijvoorbeeld een veld uit dynamicData (bijv. trade_volume_24h_btc) en reken dit om naar USD
      const volumeCell = document.createElement('td');
      // Als dynamicData.trade_volume_24h_btc bestaat, gebruik die; anders "N/A"
      const volume24hBTC = dynamicData.trade_volume_24h_btc || 0;
      const volume24hUSD = (parseFloat(volume24hBTC) * btcPrice).toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
      });
      volumeCell.textContent = volume24hUSD;
      row.appendChild(volumeCell);

      // Pairs-cell: Indien dynamicData een 'pairs' veld bevat, anders "N/A"
      const pairsCell = document.createElement('td');
      const pairs = dynamicData.pairs || 'N/A';
      pairsCell.textContent = pairs;
      row.appendChild(pairsCell);

      // Voeg de rij toe aan de tabel
      tbody.appendChild(row);
    });
  }

  // Start: laad de exchanges zodra de DOM gereed is
  loadExchanges();
});
