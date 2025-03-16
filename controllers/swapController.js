// controllers/swapController.js

const API_KEY = process.env.WOLFSWAP_API_KEY; // API-sleutel uit .env
const API_URL = "https://api-partners.wolfswap.app";

const headers = {
  "API-Key": API_KEY,
  "Content-Type": "application/json",
};

/**
 * Haalt een quote op voor een swap.
 * @param {string} srcToken - Het contractadres van de bron-token.
 * @param {string} dstToken - Het contractadres van de doel-token.
 * @param {string} amount - De hoeveelheid in wei.
 * @param {boolean} exactIn - Of de hoeveelheid een exacte input is.
 * @returns {Promise<object>} - De quote data.
 */
async function fetchQuote(srcToken, dstToken, amount, exactIn = true) {
  const url = `${API_URL}/v1/quote`;
  const body = {
    networkId: 25, // Cronos netwerk ID
    srcToken,
    dstToken,
    amount,
    exactIn,
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Fout bij het ophalen van de quote: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Fout in fetchQuote:", error);
    throw error;
  }
}

/**
 * Voert een swap uit op basis van de verkregen quote.
 * @param {object} quoteData - De data verkregen uit de quote.
 * @param {string} userWallet - Het walletadres van de gebruiker.
 * @returns {Promise<object>} - Het resultaat van de swap.
 */
async function executeSwap(quoteData, userWallet) {
  const url = `${API_URL}/v1/swap`;
  const body = {
    networkId: 25, // Cronos netwerk ID
    srcToken: quoteData.srcToken,
    dstToken: quoteData.dstToken,
    to: userWallet, // Walletadres van de gebruiker
    amountIn: quoteData.amountIn,
    amountOut: quoteData.amountOut,
    exactIn: true,
    path: quoteData.path,
    dex: quoteData.dex,
    fee: quoteData.fee,
    slippage: 200, // 2% slippage
    expiry: Math.floor(Date.now() / 1000) + 600, // Vervaldatum (10 minuten)
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Fout bij het uitvoeren van de swap: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Fout in executeSwap:", error);
    throw error;
  }
}

module.exports = { fetchQuote, executeSwap }; // Exporteer de functies