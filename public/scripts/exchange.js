// scripts/exchange.js

document.addEventListener('DOMContentLoaded', function () {
    // Haal de exchange-id uit de URL-parameter
    const urlParams = new URLSearchParams(window.location.search);
    const exchangeId = urlParams.get('id');
  
    if (!exchangeId) {
      console.error('Geen exchange-id gevonden in de URL.');
      return;
    }
  
    // Pad naar de JSON-bestanden
    const localDataUrl = './data/exchanges.json';
    const coinsDataUrl = './data/coins.json';
  
    // Fetch de lokale data van de JSON-bestanden
    Promise.all([fetch(localDataUrl), fetch(coinsDataUrl)])
      .then(responses => Promise.all(responses.map(response => {
        if (!response.ok) {
          throw new Error('Netwerk response was niet ok');
        }
        return response.json();
      })))
      .then(([localData, coinsData]) => {
        // Zoek de exchange op basis van de id
        const exchange = localData.find(ex => ex.id === exchangeId);
        if (!exchange) {
          console.error('Exchange niet gevonden.');
          return;
        }
  
        // Vul de basisgegevens in
        document.getElementById('exchange-name').textContent = exchange.name;
        document.getElementById('name').textContent = exchange.name;
        document.getElementById('description').textContent = exchange.description;
  
        // Vul de website in
        const websiteLink = document.getElementById('website');
        websiteLink.innerHTML = `<a href="${exchange.website}" target="_blank">${exchange.website}</a>`;
  
        // Vul sociale media in (verberg iconen als er geen link is)
        const socialMediaIds = ['twitter', 'facebook', 'reddit', 'telegram', 'discord', 'other-links'];
        socialMediaIds.forEach(id => {
          const link = exchange[id]; // Bijvoorbeeld exchange.twitter
          const iconElement = document.getElementById(id);
          if (link) {
            iconElement.href = link;
          } else {
            iconElement.style.display = 'none'; // Verberg het icoon als er geen link is
          }
        });
  
        // Haal API-gegevens op voor trading data
        const apiUrl = exchange.api_links.apiMain;
        fetch(apiUrl)
          .then(response => {
            if (!response.ok) {
              throw new Error('Netwerk response was niet ok');
            }
            return response.json();
          })
          .then(apiData => {
            console.log('API data voor', exchange.name, ':', apiData);
  
            // Vul het logo in vanuit de API
            const exchangeLogo = document.getElementById('exchange-logo');
            if (apiData.image) {
              exchangeLogo.src = apiData.image;
              exchangeLogo.alt = `${exchange.name} Logo`;
            } else {
              exchangeLogo.style.display = 'none'; // Verberg het logo als er geen afbeelding is
            }
  
            // Vul Year Established in
            const yearEstablished = apiData.year_established || 'N/A';
            document.getElementById('year').textContent = yearEstablished;
  
            // Vul trading data in
            document.getElementById('pairs').textContent = apiData.pairs || 'N/A';
            document.getElementById('trade-volume').textContent = apiData.trade_volume_24h_btc
              ? `$${(apiData.trade_volume_24h_btc * 50000).toLocaleString('en-US')}` // Voorbeeld BTC/USD conversie
              : 'N/A';
  
            // Vul trading pairs in
            const marketTable = document.getElementById('market-table');
            if (apiData.tickers && apiData.tickers.length > 0) {
              apiData.tickers.forEach(ticker => {
                const row = document.createElement('tr');
  
                // Base Coin met icoon en naam
                const baseCell = document.createElement('td');
                const baseCoin = coinsData[ticker.base.toUpperCase()]; // Zoek het base coin-adres op
                if (baseCoin) {
                  const baseIcon = document.createElement('img');
                  baseIcon.src = baseCoin.icon;
                  baseIcon.alt = baseCoin.name;
                  baseIcon.classList.add('coin-icon');
                  baseCell.appendChild(baseIcon);
                  baseCell.appendChild(document.createTextNode(baseCoin.name));
                } else {
                  baseCell.textContent = ticker.base; // Fallback: toon alleen het adres
                }
                row.appendChild(baseCell);
  
                // Target Coin met icoon en naam
                const targetCell = document.createElement('td');
                const targetCoin = coinsData[ticker.target.toUpperCase()]; // Zoek het target coin-adres op
                if (targetCoin) {
                  const targetIcon = document.createElement('img');
                  targetIcon.src = targetCoin.icon;
                  targetIcon.alt = targetCoin.name;
                  targetIcon.classList.add('coin-icon');
                  targetCell.appendChild(targetIcon);
                  targetCell.appendChild(document.createTextNode(targetCoin.name));
                } else {
                  targetCell.textContent = ticker.target; // Fallback: toon alleen het adres
                }
                row.appendChild(targetCell);
  
                // Last Price (USD)
                const priceCell = document.createElement('td');
                priceCell.textContent = ticker.converted_last.usd
                  ? `$${ticker.converted_last.usd.toLocaleString('en-US', { maximumFractionDigits: 6 })}`
                  : 'N/A';
                row.appendChild(priceCell);
  
                // Volume (24h)
                const volumeCell = document.createElement('td');
                volumeCell.textContent = ticker.converted_volume.usd
                  ? `$${ticker.converted_volume.usd.toLocaleString('en-US')}`
                  : 'N/A';
                row.appendChild(volumeCell);
  
                marketTable.appendChild(row);
              });
            } else {
              marketTable.innerHTML = '<tr><td colspan="4">Geen trading pairs beschikbaar.</td></tr>';
            }
          })
          .catch(error => {
            console.error('Er is een probleem opgetreden bij het laden van de API-gegevens:', error);
          });
      })
      .catch(error => {
        console.error('Er is een probleem opgetreden bij het laden van de exchange-gegevens:', error);
      });
  });