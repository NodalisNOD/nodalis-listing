document.addEventListener('DOMContentLoaded', function () {
  // URL's voor de data
  const staticDataUrl = './data/aggregators2.json';           // Statische aggregator-data
  const aggregatorDynamicUrl = './data/aggregators.json';       // Dynamische aggregator-data
  const wolfswapDataUrl = './data/wolfswap.json';               // Wolfswap-data (white listed tokens)

  const pageSize = 30;  // Aantal tokens per pagina
  let currentPage = 0;
  let tokens = [];

  // Haal alle data parallel op
  Promise.all([
    fetch(staticDataUrl).then(response => {
      if (!response.ok) throw new Error('Fout bij het laden van de statische aggregator-data.');
      return response.json();
    }),
    fetch(aggregatorDynamicUrl).then(response => {
      if (!response.ok) throw new Error('Fout bij het laden van de dynamische aggregator-data.');
      return response.json();
    }),
    fetch(wolfswapDataUrl).then(response => {
      if (!response.ok) throw new Error('Fout bij het laden van de wolfswap-data.');
      return response.json();
    })
  ])
    .then(([staticAggregator, dynamicAggregatorData, wolfswapData]) => {
      // Debug: toon de binnengekomen data
      console.log('Statische aggregator data:', staticAggregator);
      console.log('Dynamische aggregator data:', dynamicAggregatorData);
      console.log('Wolfswap data:', wolfswapData);

      // Check de URL-parameter voor aggregator-id
      const urlParams = new URLSearchParams(window.location.search);
      const aggregatorId = urlParams.get('id');
      if (staticAggregator.id !== aggregatorId) {
        console.error('Aggregator in statische data komt niet overeen met de opgegeven id.');
        return;
      }

      // Vul de statische gegevens in
      document.getElementById('aggregator-name').textContent = staticAggregator.name;
      document.getElementById('name').textContent = staticAggregator.name;
      document.getElementById('description').textContent = staticAggregator.description || 'Geen beschrijving beschikbaar.';
      
      const websiteLink = document.getElementById('website');
      if (staticAggregator.website) {
        websiteLink.innerHTML = `<a href="${staticAggregator.website}" target="_blank">${staticAggregator.website}</a>`;
      } else {
        websiteLink.textContent = 'Niet beschikbaar';
      }
      
      // Sociale media (voorbeeld met Twitter)
      if (staticAggregator.twitter) {
        document.getElementById('twitter').href = staticAggregator.twitter;
      } else {
        document.getElementById('twitter').style.display = 'none';
      }
      
      // Logo
      const aggregatorLogo = document.getElementById('aggregator-logo');
      let iconPath = staticAggregator.icon;
      if (iconPath.startsWith("public/")) {
        iconPath = "/" + iconPath.slice("public/".length);
      }
      aggregatorLogo.src = iconPath;
      aggregatorLogo.alt = `${staticAggregator.name} Logo`;
      
      // Year Established
      document.getElementById('year').textContent = staticAggregator.year || 'N/A';

      // Zoek in de dynamische data naar het object dat bij deze aggregator past.
      // Verwachting: dynamicAggregatorData bevat een array onder protocols.
      let matchingAggregator = null;
      if (dynamicAggregatorData.protocols && Array.isArray(dynamicAggregatorData.protocols)) {
        matchingAggregator = dynamicAggregatorData.protocols.find(agg => {
          console.log('Vergelijking:', agg.name, 'met', staticAggregator.name);
          return agg.name.toLowerCase() === staticAggregator.name.toLowerCase();
        });
      } else {
        // Fallback: als dynamicAggregatorData niet in een array zit, gebruik de data direct
        matchingAggregator = dynamicAggregatorData;
      }
      
      if (matchingAggregator) {
        console.log('Gevonden aggregator:', matchingAggregator);
      } else {
        console.warn('Geen matching aggregator gevonden op basis van naam:', staticAggregator.name);
      }

      // Dynamische gegevens: toon de 24-uurs volume (total24h)
      const tradeVolumeElem = document.getElementById('trade-volume');
      if (matchingAggregator && matchingAggregator.total24h != null) {
        const vol = matchingAggregator.total24h;
        console.log('Volume opgehaald:', vol);
        const volFormatted = parseFloat(vol).toLocaleString('en-US', {
          style: 'currency',
          currency: 'USD'
        });
        tradeVolumeElem.textContent = volFormatted;
      } else {
        console.warn('Volume data niet beschikbaar in matching aggregator:', matchingAggregator);
        tradeVolumeElem.textContent = 'N/A';
      }

      // White listed tokens uit de wolfswap data
      if (wolfswapData && Array.isArray(wolfswapData.allListedTokens)) {
        tokens = wolfswapData.allListedTokens;
        document.getElementById('whitelisted').textContent = tokens.length;
      } else {
        document.getElementById('whitelisted').textContent = 'N/A';
      }

      // Render de token tabel en paginatie
      renderTokenTable();
      renderPaginationControls();
    })
    .catch(error => {
      console.error('Er is een probleem opgetreden bij het laden van de data:', error);
    });

  // Functie: rendert de token tabel
  function renderTokenTable() {
    const tokenTable = document.getElementById('market-table');
    tokenTable.innerHTML = "";

    if (tokens.length === 0) {
      tokenTable.innerHTML = '<tr><td colspan="3">Geen white listed tokens beschikbaar.</td></tr>';
      return;
    }

    // Bepaal de tokens voor de huidige pagina
    const start = currentPage * pageSize;
    const end = start + pageSize;
    const pageTokens = tokens.slice(start, end);

    pageTokens.forEach(token => {
      const row = document.createElement('tr');

      // Token naam met logo
      const tokenCell = document.createElement('td');
      const tokenContainer = document.createElement('span');
      tokenContainer.style.display = 'flex';
      tokenContainer.style.alignItems = 'center';
      if (token.logoURI) {
        const tokenImg = document.createElement('img');
        tokenImg.src = token.logoURI;
        tokenImg.alt = token.name;
        tokenImg.style.width = '20px';
        tokenImg.style.height = '20px';
        tokenImg.style.marginRight = '5px';
        tokenContainer.appendChild(tokenImg);
      }
      tokenContainer.appendChild(document.createTextNode(token.name));
      tokenCell.appendChild(tokenContainer);
      row.appendChild(tokenCell);

      // Token symbool
      const symbolCell = document.createElement('td');
      symbolCell.textContent = token.symbol || 'N/A';
      row.appendChild(symbolCell);

      // Token adres
      const addressCell = document.createElement('td');
      addressCell.textContent = token.address || 'N/A';
      row.appendChild(addressCell);

      tokenTable.appendChild(row);
    });
  }

  // Functie: rendert de paginatieknoppen
  function renderPaginationControls() {
    const paginationContainer = document.getElementById('pagination');
    paginationContainer.innerHTML = "";
    const totalPages = Math.ceil(tokens.length / pageSize);

    // Als er maar één pagina is, toon geen knoppen
    if (totalPages <= 1) return;

    for (let i = 0; i < totalPages; i++) {
      const btn = document.createElement('button');
      btn.textContent = i + 1;
      btn.classList.add('pagination-btn');
      if (i === currentPage) {
        btn.classList.add('active');
      }
      btn.addEventListener('click', () => {
        currentPage = i;
        renderTokenTable();
        renderPaginationControls();
      });
      paginationContainer.appendChild(btn);
    }
  }
});
