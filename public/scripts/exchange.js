// scripts/exchange.js

document.addEventListener('DOMContentLoaded', function () {
  // Haal de exchange-id uit de URL-parameter
  const urlParams = new URLSearchParams(window.location.search);
  const exchangeId = urlParams.get('id');

  if (!exchangeId) {
    console.error('Geen exchange-id gevonden in de URL.');
    return;
  }

  // Paden naar de lokale data
  const staticDataUrl = './data/exchanges.json';
  const coinsDataUrl = './data/coins.json';
  // Dynamische data halen we uit de server-side cache (bijv. exchangeCache.json via /api/exchanges)
  const exchangeCacheUrl = '/api/exchanges';

  // Paginering voor tickers
  const pageSize = 25;
  let currentPage = 0;
  let tickers = [];

  // Haal de drie datasets parallel op
  Promise.all([
    fetch(staticDataUrl),
    fetch(coinsDataUrl),
    fetch(exchangeCacheUrl)
  ])
    .then(responses => Promise.all(responses.map(response => {
      if (!response.ok) {
        throw new Error('Netwerk response was niet ok');
      }
      return response.json();
    })))
    .then(([staticExchanges, coinsData, exchangeCache]) => {
      // Zoek de exchange op in de statische data
      const exchangeStatic = staticExchanges.find(ex => ex.id === exchangeId);
      if (!exchangeStatic) {
        console.error('Exchange niet gevonden.');
        return;
      }

      // Haal de dynamische gegevens op uit de cache (of gebruik een leeg object als er niets staat)
      const dynamicData = exchangeCache[exchangeId] || {};

      // Vul de basisgegevens in
      document.getElementById('exchange-name').textContent = exchangeStatic.name;
      document.getElementById('name').textContent = exchangeStatic.name;
      document.getElementById('description').textContent = exchangeStatic.description;

      // Website
      const websiteLink = document.getElementById('website');
      websiteLink.innerHTML = `<a href="${exchangeStatic.website}" target="_blank">${exchangeStatic.website}</a>`;

      // Sociale media: verberg iconen als er geen link is
      const socialMediaIds = ['twitter', 'facebook', 'reddit', 'telegram', 'discord', 'other-links'];
      socialMediaIds.forEach(id => {
        const link = exchangeStatic[id];
        const iconElement = document.getElementById(id);
        if (link) {
          iconElement.href = link;
        } else if (iconElement) {
          iconElement.style.display = 'none';
        }
      });

      // Logo: als dynamicData.image aanwezig is, gebruik die; anders gebruik het statische icoon
      const exchangeLogo = document.getElementById('exchange-logo');
      if (dynamicData.image) {
        exchangeLogo.src = dynamicData.image;
        exchangeLogo.alt = `${exchangeStatic.name} Logo`;
      } else {
        let iconPath = exchangeStatic.icon;
        if (iconPath.startsWith("public/")) {
          iconPath = "/" + iconPath.slice("public/".length);
        }
        exchangeLogo.src = iconPath;
        exchangeLogo.alt = `${exchangeStatic.name} Logo`;
      }

      // Year Established
      const yearEstablished = dynamicData.year_established || 'N/A';
      document.getElementById('year').textContent = yearEstablished;

      // Trading data: Pairs en Trade Volume (24h)
      document.getElementById('pairs').textContent = dynamicData.pairs || 'N/A';
      const tradeVolumeBTC = dynamicData.trade_volume_24h_btc || 0;
      const btcConversionRate = 50000; // voorbeeldwaarde
      document.getElementById('trade-volume').textContent = tradeVolumeBTC
        ? `$${(parseFloat(tradeVolumeBTC) * btcConversionRate).toLocaleString('en-US')}`
        : 'N/A';

      // Verwerk tickers (trading pairs) met paginering
      tickers = dynamicData.tickers || [];
      renderMarketTable();
      renderPaginationControls();

      // Functie om de markttabel voor de huidige pagina te renderen
      function renderMarketTable() {
        const marketTable = document.getElementById('market-table');
        marketTable.innerHTML = "";
        if (tickers.length === 0) {
          marketTable.innerHTML = '<tr><td colspan="4">Geen trading pairs beschikbaar.</td></tr>';
          return;
        }
        const start = currentPage * pageSize;
        const end = start + pageSize;
        const pageTickers = tickers.slice(start, end);

        pageTickers.forEach(ticker => {
          const row = document.createElement('tr');

          // Base Coin
          const baseCell = document.createElement('td');
          const baseCoin = coinsData[ticker.base.toUpperCase()];
          if (baseCoin) {
            const baseIcon = document.createElement('img');
            baseIcon.src = baseCoin.icon;
            baseIcon.alt = baseCoin.name;
            baseIcon.classList.add('coin-icon');
            baseCell.appendChild(baseIcon);
            baseCell.appendChild(document.createTextNode(baseCoin.name));
          } else {
            baseCell.textContent = ticker.base;
          }
          row.appendChild(baseCell);

          // Target Coin
          const targetCell = document.createElement('td');
          const targetCoin = coinsData[ticker.target.toUpperCase()];
          if (targetCoin) {
            const targetIcon = document.createElement('img');
            targetIcon.src = targetCoin.icon;
            targetIcon.alt = targetCoin.name;
            targetIcon.classList.add('coin-icon');
            targetCell.appendChild(targetIcon);
            targetCell.appendChild(document.createTextNode(targetCoin.name));
          } else {
            targetCell.textContent = ticker.target;
          }
          row.appendChild(targetCell);

          // Last Price (USD)
          const priceCell = document.createElement('td');
          priceCell.textContent = ticker.converted_last && ticker.converted_last.usd
            ? `$${ticker.converted_last.usd.toLocaleString('en-US', { maximumFractionDigits: 6 })}`
            : 'N/A';
          row.appendChild(priceCell);

          // Volume (24h)
          const volumeCell = document.createElement('td');
          volumeCell.textContent = ticker.converted_volume && ticker.converted_volume.usd
            ? `$${ticker.converted_volume.usd.toLocaleString('en-US')}`
            : 'N/A';
          row.appendChild(volumeCell);

          marketTable.appendChild(row);
        });
      }

      // Functie om de paginaknoppen te renderen
      function renderPaginationControls() {
        const paginationContainer = document.getElementById('pagination');
        if (!paginationContainer) {
          console.warn('Pagination container niet gevonden.');
          return;
        }
        paginationContainer.innerHTML = "";
        const totalPages = Math.ceil(tickers.length / pageSize);
        if (totalPages <= 1) return; // geen paginering nodig

        for (let i = 0; i < totalPages; i++) {
          const btn = document.createElement('button');
          btn.textContent = (i + 1);
          btn.classList.add('pagination-btn'); // CSS-klas om te stylen via je externe CSS
          if (i === currentPage) {
            btn.classList.add('active');
          }
          btn.addEventListener('click', () => {
            currentPage = i;
            renderMarketTable();
            renderPaginationControls();
          });
          paginationContainer.appendChild(btn);
        }
      }
    })
    .catch(error => {
      console.error('Er is een probleem opgetreden bij het laden van de exchange-gegevens:', error);
    });
});
