document.addEventListener('DOMContentLoaded', function () {
  // Functie om de BTC/USD-prijs op te halen via CoinGecko (wordt voor exchanges gebruikt)
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

  // Functie om de exchanges te laden
  async function loadExchanges() {
    const btcPrice = await getBTCPrice();
    if (!btcPrice) {
      console.error('Kon BTC-prijs niet ophalen. Stoppen...');
      return;
    }

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

    let dynamicExchanges = {};
    try {
      const response = await fetch('/api/exchanges');
      if (!response.ok) {
        throw new Error('Netwerk response was niet ok');
      }
      dynamicExchanges = await response.json();
      console.log('Dynamische exchange cache:', dynamicExchanges);
    } catch (error) {
      console.error('Er is een probleem opgetreden bij het laden van de dynamische exchanges:', error);
      return;
    }

    const tbody = document.getElementById('exchange-table');
    tbody.innerHTML = "";

    staticExchanges.forEach(exchangeStatic => {
      const dynamicData = dynamicExchanges[exchangeStatic.id] || {};

      const row = document.createElement('tr');

      // Naam-cell met icoon en link
      const nameCell = document.createElement('td');
      const container = document.createElement('span');
      container.style.display = 'flex';
      container.style.alignItems = 'center';

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

      const link = document.createElement('a');
      link.href = `detail.html?id=${exchangeStatic.id}`;
      link.textContent = exchangeStatic.name;
      container.appendChild(link);
      nameCell.appendChild(container);
      row.appendChild(nameCell);

      // Volume-cell: omzetting van BTC-volume naar USD
      const volumeCell = document.createElement('td');
      const volume24hBTC = dynamicData.trade_volume_24h_btc || 0;
      const volume24hUSD = (parseFloat(volume24hBTC) * btcPrice).toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
      });
      volumeCell.textContent = volume24hUSD;
      row.appendChild(volumeCell);

      // Pairs-cell
      const pairsCell = document.createElement('td');
      const pairs = dynamicData.pairs || 'N/A';
      pairsCell.textContent = pairs;
      row.appendChild(pairsCell);

      tbody.appendChild(row);
    });
  }

  // Functie om de aggregators te laden (voor nu enkel Wolfswap)
  async function loadAggregators() {
    // Haal aggregatordata op van DefiLlama (voor volume, logo, etc.)
    const aggregatorApiUrl = 'https://api.llama.fi/overview/aggregators?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true&dataType=dailyVolume';
    let aggregatorData = {};
    try {
      const response = await fetch(aggregatorApiUrl);
      if (!response.ok) {
        throw new Error('Netwerk response was niet ok');
      }
      aggregatorData = await response.json();
      console.log('Aggregator data:', aggregatorData);
    } catch (error) {
      console.error('Er is een probleem opgetreden bij het laden van de aggregators:', error);
      return;
    }
    // De API retourneert een array in aggregatorData.protocols
    const aggregatorsArray = aggregatorData.protocols;
    const wolfswapAggregator = aggregatorsArray.find(protocol => protocol.name === 'Wolfswap');
    if (!wolfswapAggregator) {
      console.error('Wolfswap aggregator niet gevonden in de API data.');
      return;
    }

    // Haal de Wolfswap-cache op (die is opgeslagen in wolfswap.json)
    let wolfswapCache = {};
    try {
      const response = await fetch('/api/wolfswap');
      if (!response.ok) {
        throw new Error('Netwerk response was niet ok');
      }
      wolfswapCache = await response.json();
      console.log('Wolfswap cache:', wolfswapCache);
    } catch (error) {
      console.error("Er is een probleem opgetreden bij het laden van de Wolfswap-cache:", error);
      return;
    }
    // Gebruik het aantal tokens uit allListedTokens als "pairs"
    const tokensCount = (wolfswapCache.allListedTokens && wolfswapCache.allListedTokens.length) || 0;

    // Bouw de aggregator-tabelrij op
    const tbody = document.getElementById('aggregator-table');
    tbody.innerHTML = "";

    const row = document.createElement('tr');

    // Naam-cell: gebruik logo en displayName (of name)
    const nameCell = document.createElement('td');
    const container = document.createElement('span');
    container.style.display = 'flex';
    container.style.alignItems = 'center';

    const iconImg = document.createElement('img');
    iconImg.src = wolfswapAggregator.logo;
    iconImg.alt = wolfswapAggregator.displayName || wolfswapAggregator.name;
    iconImg.style.width = '20px';
    iconImg.style.height = '20px';
    iconImg.style.marginRight = '5px';
    container.appendChild(iconImg);

    const link = document.createElement('a');
    // Verwijs nu naar aggregator.html in plaats van detail.html
    link.href = `aggregator.html?id=${wolfswapAggregator.defillamaId}`;
    link.textContent = wolfswapAggregator.displayName || wolfswapAggregator.name;
    container.appendChild(link);
    nameCell.appendChild(container);
    row.appendChild(nameCell);

    // Volume-cell: toon de total24h waarde (uit DefiLlama-gegevens)
    const volumeCell = document.createElement('td');
    const volume24h = wolfswapAggregator.total24h || 0;
    const volume24hFormatted = parseFloat(volume24h).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD'
    });
    volumeCell.textContent = volume24hFormatted;
    row.appendChild(volumeCell);

    // Pairs-cell: toon het aantal tokens (zonder extra tekst)
    const pairsCell = document.createElement('td');
    pairsCell.textContent = tokensCount;
    row.appendChild(pairsCell);

    tbody.appendChild(row);
  }

  // Start: laad zowel exchanges als aggregators zodra de DOM gereed is
  loadExchanges();
  loadAggregators();
});
