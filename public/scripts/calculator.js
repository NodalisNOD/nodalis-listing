// Vul de token dropdown met data uit coin-data.json
async function populateTokens() {
  const tokenSelect = document.getElementById("token");
  try {
    const response = await fetch("/data/coin-data.json");
    const coins = await response.json();
    coins.forEach((coin) => {
      const option = document.createElement("option");
      // Zorg ervoor dat de coin-id in lowercase en met dashes komt,
      // zodat het overeenkomt met de keys in coinCache.json.
      option.value = coin.id.toLowerCase().replace(/\s+/g, "-");
      option.textContent = coin.name; // bv. "PigeonToken"
      // Sla statische info op voor gebruik in de dropdown
      option.dataset.icon = coin.icon; // Logo zoals "./assets/coinIcons/piq.jpg"
      // Sla de generalApi URL op zodat we deze eventueel als fallback kunnen gebruiken
      option.dataset.apiUrl = coin.dynamicData.generalApi;
      tokenSelect.appendChild(option);
    });
    // Activeer de select2 plugin met een aangepaste template
    $("#token").select2({
      templateResult: formatToken,
      templateSelection: formatToken,
    });
  } catch (error) {
    console.error("Error fetching coin-data.json:", error);
  }
}

// Template voor de token dropdown-opties
function formatToken(token) {
  if (!token.id) return token.text;
  const icon = $(token.element).data("icon") || "./assets/default.png";
  return $(`<span><img src="${icon}" class="token-icon" /> ${token.text}</span>`);
}

// Haal de tokenprijs op uit de lokale coinCache.json voor een gegeven coinId
async function fetchTokenPrice(coinId) {
  try {
    const response = await fetch("/data/coinCache.json");
    const coinCache = await response.json();
    // Verwacht dat coinCache[coinId] een array is
    const coinDataArray = coinCache[coinId];
    if (coinDataArray && coinDataArray.length > 0) {
      // Gebruik de eerste entry uit de array
      const coinData = coinDataArray[0];
      // Haal de prijs op uit het veld "priceUsd"
      const priceStr = coinData.priceUsd;
      const price = parseFloat(priceStr);
      return price;
    } else {
      console.warn("Geen prijsdata gevonden in cache voor:", coinId);
      return null;
    }
  } catch (error) {
    console.error("Error fetching token price from cache:", error);
    return null;
  }
}


// Haal de CRO-prijs op uit het lokale croPrice.json-bestand
async function fetchCronosPrice() {
  try {
    const response = await fetch("/data/croPrice.json");
    const data = await response.json();
    return parseFloat(data.cronosPrice);
  } catch (error) {
    console.error("Error fetching Cronos price from croPrice.json:", error);
    return null;
  }
}

// Bereken de waarde op basis van de ingevoerde hoeveelheid en geselecteerde valuta
async function calculateValue() {
  const amount = parseFloat(document.getElementById("amount").value);
  const currency = document.getElementById("currency").value;
  const tokenSelect = document.getElementById("token");
  const selectedOption = tokenSelect.options[tokenSelect.selectedIndex];
  const tokenName = selectedOption.textContent;
  const coinId = selectedOption.value; // Dit is nu bijvoorbeeld "degen-mole"

  if (isNaN(amount) || amount <= 0) {
    document.getElementById("result").textContent = "Enter a valid amount.";
    return;
  }

  const tokenPrice = await fetchTokenPrice(coinId);
  if (!tokenPrice) {
    document.getElementById("result").textContent = "Error fetching token price.";
    return;
  }

  let resultText = "";
  let formulaText = "";

  if (currency === "USD") {
    const tokenAmount = amount / tokenPrice;
    resultText = `${amount} USD = ${tokenAmount.toFixed(6)} ${tokenName}`;
    formulaText = `Formula: ${amount} USD ÷ ${tokenPrice.toFixed(6)} = ${tokenAmount.toFixed(6)} ${tokenName}`;
  } else if (currency === "CRO") {
    const croPrice = await fetchCronosPrice();
    if (!croPrice) {
      document.getElementById("result").textContent = "Error fetching Cronos price.";
      return;
    }
    const amountInUsd = amount * croPrice;
    const tokenAmount = amountInUsd / tokenPrice;
    resultText = `${amount} CRO = ${tokenAmount.toFixed(6)} ${tokenName}`;
    formulaText = `Formula: (${amount} CRO × ${croPrice.toFixed(6)} USD) ÷ ${tokenPrice.toFixed(6)} = ${tokenAmount.toFixed(6)} ${tokenName}`;
  }

  document.getElementById("formula").innerHTML = `<small>${formulaText}</small>`;
  document.getElementById("result").textContent = resultText;
}

// Start het script zodra de DOM geladen is
document.addEventListener("DOMContentLoaded", () => {
  populateTokens();
  document.getElementById("calculate").addEventListener("click", calculateValue);
});
