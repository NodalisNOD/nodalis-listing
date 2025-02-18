async function loadExchangeData() {
    try {
        // Load exchanges.json
        let response = await fetch('data/exchanges.json');
        let data = await response.json();
        let exchange = data[0];

        // **Extra API-data ophalen via jouw server**
        let apiResponse = await fetch('/api/coingecko/exchange'); 
        let apiData = await apiResponse.json();

        // **BTC prijs ophalen via proxy**
        let btcPriceResponse = await fetch('/api/coingecko/btcprice');
        let btcPriceData = await btcPriceResponse.json();

        // Controleer of BTC prijs correct geladen is
        let btcToUsd = btcPriceData?.bitcoin?.usd || 0;
        if (!btcToUsd) {
            console.warn("BTC prijs data ontbreekt of is niet correct geladen.");
        }

        let tradeVolumeBtc = apiData.trade_volume_24h_btc || 0;
        let tradeVolumeUsd = (tradeVolumeBtc * btcToUsd).toFixed(2);

        // **Coin-adresdata ophalen**
        let coinsResponse = await fetch('data/coins.json');
        let coinsData = await coinsResponse.json();

        // **Update HTML met de gegevens (zonder dubbele labels)**
        document.getElementById('exchange-name').textContent = exchange.name;
        document.getElementById('name').textContent = exchange.name;
        document.getElementById('year').textContent = apiData.year_established || 'N/A';
        document.getElementById('description').textContent = exchange.description;
        document.getElementById('exchange-logo').src = apiData.image;

        document.getElementById('pairs').textContent = apiData.pairs || 'N/A';
        document.getElementById('trade-volume').textContent = "$" + tradeVolumeUsd;

        // **Website correct weergeven als klikbare link zonder extra "Website:"**
        let websiteElement = document.getElementById('website');
        if (exchange.website) {
            websiteElement.innerHTML = `<a href="${exchange.website}" target="_blank">${exchange.website}</a>`;
            websiteElement.style.display = "block";
        } else {
            websiteElement.style.display = "none";
        }

        // **Social media links (met iconen en zonder lege velden)**
        let socialMediaLinks = {
            twitter: exchange.twitter,
            facebook: exchange.facebook,
            reddit: exchange.reddit,
            telegram: exchange.telegram,
            discord: exchange.discord,
            "other-links": exchange.otherLinks
        };

        for (let key in socialMediaLinks) {
            let element = document.getElementById(key);
            if (socialMediaLinks[key]) {
                element.innerHTML = `<a href="${socialMediaLinks[key]}" target="_blank"><img src="assets/UI/${key}.png" class="icon"></a>`;
                element.style.display = "inline-block";
            } else {
                element.style.display = "none";
            }
        }

        // **Handelsparen tabel opbouwen**
        let marketTable = document.getElementById('market-table');
        marketTable.innerHTML = "";

        apiData.tickers.forEach((ticker) => {
            let baseCoin = coinsData[ticker.base] || { name: ticker.base, icon: "assets/coinIcons/default.png" };
            let targetCoin = coinsData[ticker.target] || { name: ticker.target, icon: "assets/coinIcons/default.png" };

            let row = document.createElement('tr');

            row.innerHTML = `
                <td><img src="${baseCoin.icon}" class="coin-icon"> ${baseCoin.name}</td>
                <td><img src="${targetCoin.icon}" class="coin-icon"> ${targetCoin.name}</td>
                <td>$${ticker.converted_last.usd.toFixed(4)}</td>
                <td>${ticker.volume ? ticker.volume.toLocaleString() : 'N/A'}</td>
            `;

            marketTable.appendChild(row);
        });

    } catch (error) {
        console.error("Fout bij laden van gegevens:", error);
        document.getElementById('exchange-name').textContent = "Fout bij laden!";
    }
}

// Laad de gegevens wanneer de pagina geladen wordt
window.onload = loadExchangeData;
