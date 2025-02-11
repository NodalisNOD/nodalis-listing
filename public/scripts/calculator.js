import { coins } from "./altcoins.js"; 

// fill the token dropdown with icons
async function populateTokens() {
  const tokenSelect = document.getElementById("token");

  coins.forEach((coin) => {
    const option = document.createElement("option");
    option.value = coin.contract;
    option.textContent = coin.name;
    option.dataset.icon = coin.icon;
    option.dataset.apiUrl = coin.apiUrl;
    tokenSelect.appendChild(option);
  });

  // Activate select2 plugin
  $("#token").select2({
    templateResult: formatToken,
    templateSelection: formatToken,
  });
}

// Token dropdown template
function formatToken(token) {
  if (!token.id) return token.text;
  const icon = $(token.element).data("icon");
  return $(`<span><img src="${icon}" class="token-icon"/> ${token.text}</span>`);
}

// API call to fetch token price
async function fetchTokenPrice(apiUrl) {
  try {
    const response = await fetch(apiUrl);
    const data = await response.json();
    const price = parseFloat(data.data[0].attributes.base_token_price_usd);
    return price;
  } catch (error) {
    console.error("Error fetching token price:", error);
    return null;
  }
}

// calculate the token value
async function calculateValue() {
  const amount = parseFloat(document.getElementById("amount").value);
  const currency = document.getElementById("currency").value;
  const tokenSelect = document.getElementById("token");
  const selectedOption = tokenSelect.options[tokenSelect.selectedIndex];
  const tokenName = selectedOption.textContent;
  const tokenPriceApi = selectedOption.dataset.apiUrl;

  if (isNaN(amount) || amount <= 0) {
    document.getElementById("result").textContent = "Enter a valid amount.";
    return;
  }

  const tokenPrice = await fetchTokenPrice(tokenPriceApi);
  if (!tokenPrice) {
    document.getElementById("result").textContent = "Error fetching token price.";
    return;
  }

  let resultText = "";
  let formulaText = "";

  if (currency === "USD") {
    const tokenAmount = amount / tokenPrice;
    resultText = `${amount} USD = ${tokenAmount.toFixed(6)} ${tokenName}`;
    formulaText = `Formula: ${amount} USD ÷ ${tokenPrice.toFixed(6)} (Token Price) = ${tokenAmount.toFixed(6)} ${tokenName}`;
  } else if (currency === "CRO") {
    const croPrice = await fetchCronosPrice();
    const amountInUsd = amount * croPrice;
    const tokenAmount = amountInUsd / tokenPrice;
    resultText = `${amount} CRO = ${tokenAmount.toFixed(6)} ${tokenName}`;
    formulaText = `Formula: (${amount} CRO × ${croPrice.toFixed(6)} USD) ÷ ${tokenPrice.toFixed(6)} = ${tokenAmount.toFixed(6)} ${tokenName}`;
  }

  document.getElementById("formula").innerHTML = `<small>${formulaText}</small>`;
  document.getElementById("result").textContent = resultText;
}

// fetch Cronos price
async function fetchCronosPrice() {
  try {
    const response = await fetch(
      "https://api.geckoterminal.com/api/v2/simple/networks/cro/token_price/0x5c7f8a570d578ed84e63fdfa7b1ee72deae1ae23"
    );
    const data = await response.json();
    return parseFloat(data.data.attributes.token_prices["0x5c7f8a570d578ed84e63fdfa7b1ee72deae1ae23"]);
  } catch (error) {
    console.error("Error fetching Cronos price:", error);
    return null;
  }
}

// Start script
document.addEventListener("DOMContentLoaded", () => {
  populateTokens();
  document.getElementById("calculate").addEventListener("click", calculateValue);
});
