// scripts/dexs.js

document.addEventListener('DOMContentLoaded', function () {
    // Functie om de BTC/USD-prijs op te halen
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
  
    // Functie om de exchanges in te laden en de tabel te vullen
    async function loadExchanges() {
      // Haal de BTC/USD-prijs op
      const btcPrice = await getBTCPrice();
      if (!btcPrice) {
        console.error('Kon BTC-prijs niet ophalen. Stoppen...');
        return;
      }
  
      // Pad naar het exchanges.json bestand
      const localDataUrl = './data/exchanges.json';
  
      // Fetch de lokale data van het JSON bestand
      fetch(localDataUrl)
        .then(response => {
          if (!response.ok) {
            throw new Error('Netwerk response was niet ok');
          }
          return response.json();
        })
        .then(localData => {
          console.log('Lokale data:', localData); // Controleer de geladen lokale data
  
          // Loop door de lokale data en haal API-gegevens op voor elke exchange
          localData.forEach(exchange => {
            const apiUrl = exchange.api_links.apiMain; // API URL uit de lokale data
  
            // Fetch de API-gegevens voor de exchange
            fetch(apiUrl)
              .then(response => {
                if (!response.ok) {
                  throw new Error('Netwerk response was niet ok');
                }
                return response.json();
              })
              .then(apiData => {
                console.log('API data voor', exchange.name, ':', apiData); // Controleer de API data
  
                // Verwijzing naar de tbody van de tabel
                const tbody = document.getElementById('exchange-table');
  
                // Maak een nieuwe rij voor de exchange
                const row = document.createElement('tr');
  
                // Exchange naam (klikbaar en link naar detailpagina)
                const nameCell = document.createElement('td');
                const link = document.createElement('a');
                link.href = `detail.html?id=${exchange.id}`; // Link naar detailpagina met id
                link.textContent = exchange.name;
                nameCell.appendChild(link);
                row.appendChild(nameCell);
  
                // 24h Volume (BTC naar USD omrekenen)
                const volumeCell = document.createElement('td');
                const volume24hBTC = apiData.trade_volume_24h_btc || 0; // Gebruik 0 als fallback
                const volume24hUSD = (volume24hBTC * btcPrice).toLocaleString('en-US', {
                  style: 'currency',
                  currency: 'USD',
                });
                volumeCell.textContent = volume24hUSD;
                row.appendChild(volumeCell);
  
                // Pairs (uit de API)
                const pairsCell = document.createElement('td');
                const pairs = apiData.pairs || 'N/A';
                pairsCell.textContent = pairs;
                row.appendChild(pairsCell);
  
                // Voeg de rij toe aan de tbody
                tbody.appendChild(row);
              })
              .catch(error => {
                console.error('Er is een probleem opgetreden bij het laden van de API-gegevens voor', exchange.name, ':', error);
              });
          });
        })
        .catch(error => {
          console.error('Er is een probleem opgetreden bij het laden van de lokale exchanges:', error);
        });
    }
  
    // Roep de functie aan om de exchanges in te laden
    loadExchanges();
  });