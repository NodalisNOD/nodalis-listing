// generateWeeklyReport.js

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const cron = require('node-cron');

// Paden instellen
const dataDir = path.join(__dirname, 'public', 'data');
const coinCachePath = path.join(dataDir, 'coinCache.json');
const coinHistoryPath = path.join(dataDir, 'coinHistory.json');
const coinVotesDbPath = path.join(dataDir, 'coin_votes.db');

// Helper om JSON te lezen en te schrijven
function readJSON(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content);
    } else {
      return null;
    }
  } catch (error) {
    console.error(`Error reading JSON from ${filePath}:`, error);
    return null;
  }
}

function writeJSON(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`JSON written to ${filePath}`);
  } catch (error) {
    console.error(`Error writing JSON to ${filePath}:`, error);
  }
}

// Helper functies om prijsdata te aggregeren
function getPairValues(pair) {
  let vol = 0, liq = 0, price = 0, mc = 0;
  if (pair.data && pair.data.attributes) {
    // Geckoterminal-structuur
    const attr = pair.data.attributes;
    vol = parseFloat(attr.volume_usd?.h24) || 0;
    liq = parseFloat(attr.reserve_in_usd) || 0;
    price = parseFloat(attr.base_token_price_usd) || 0;
    mc = parseFloat(attr.market_cap_usd);
    if (isNaN(mc)) {
      mc = parseFloat(attr.fdv_usd) || 0;
    }
  } else {
    // Dexscreener-structuur
    vol = parseFloat(pair.volume?.h24) || 0;
    liq = parseFloat(pair.liquidity?.usd) || 0;
    price = parseFloat(pair.priceUsd) || 0;
    mc = parseFloat(pair.marketCap);
    if (isNaN(mc)) {
      mc = parseFloat(pair.fdv) || 0;
    }
  }
  return { vol, liq, price, mc };
}

function aggregateDynamicData(pairs) {
  let totalVolume = 0;
  let totalLiquidity = 0;
  let weightedPriceSum = 0;
  let totalMarketCap = 0;
  
  pairs.forEach(pair => {
    const { vol, liq, price, mc } = getPairValues(pair);
    totalVolume += vol;
    totalLiquidity += liq;
    weightedPriceSum += price * liq;
    totalMarketCap += mc;
  });
  
  const aggregatedPrice = totalLiquidity > 0 ? weightedPriceSum / totalLiquidity : 0;
  
  return {
    price: aggregatedPrice,
    volume: totalVolume,
    liquidity: totalLiquidity,
    marketCap: totalMarketCap
  };
}

// Als extra helper: retourneer de geaggregeerde prijs
function aggregatedPriceForCoin(pairs) {
  return aggregateDynamicData(pairs).price;
}

// Functie om sentiment votes voor een coin (de afgelopen 7 dagen) op te halen uit de coin_votes DB
function fetchSentimentForCoin(coinId) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(coinVotesDbPath, (err) => {
      if (err) {
        console.error('Error opening coin_votes DB:', err.message);
        return reject(err);
      }
    });
    // Stel dat we de votes van de afgelopen 7 dagen willen meenemen:
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const query = `
      SELECT 
        SUM(CASE WHEN voteType = 'positive' THEN 1 ELSE 0 END) as positive,
        SUM(CASE WHEN voteType = 'negative' THEN 1 ELSE 0 END) as negative
      FROM coin_votes
      WHERE coinId = ? AND voteTime >= ?
    `;
    db.get(query, [coinId, sevenDaysAgo], (err, row) => {
      if (err) {
        console.error('Error querying coin_votes for', coinId, err.message);
        db.close();
        return reject(err);
      }
      row = row || { positive: 0, negative: 0 };
      row.total = (row.positive || 0) + (row.negative || 0);
      db.close();
      resolve(row);
    });
  });
}

// Hoofdfunctie: Genereer de wekelijkse (of dagelijkse) rapportage
async function generateReport() {
  console.log("⏳ Generating weekly report...");
  const coinCache = readJSON(coinCachePath);
  if (!coinCache) {
    console.error("Coin cache not found.");
    return;
  }
  
  // Laad bestaande coinHistory of start met een leeg object
  let coinHistory = readJSON(coinHistoryPath) || {};
  const now = Date.now();
  
  const coinIds = Object.keys(coinCache);
  for (let coinId of coinIds) {
    const pairs = coinCache[coinId];
    // Zorg dat we werken met een array (als het geen array is, maak er een array van)
    const coinPairs = Array.isArray(pairs) ? pairs : [pairs];
    // Haal de geaggregeerde prijs op
    const aggregatedPrice = aggregatedPriceForCoin(coinPairs);
    
    // Haal sentiment votes voor de afgelopen 7 dagen op
    let sentiment;
    try {
      sentiment = await fetchSentimentForCoin(coinId);
    } catch (error) {
      sentiment = { positive: 0, negative: 0, total: 0 };
    }
    
    // Maak een historisch entry-object voor deze coin
    const entry = {
      timestamp: now,
      priceUsd: aggregatedPrice,
      sentiment: sentiment
    };
    
    // Voeg dit entry toe aan het coinHistory-object
    if (!coinHistory[coinId]) {
      coinHistory[coinId] = [];
    }
    coinHistory[coinId].push(entry);
  }
  
  // Schrijf het bijgewerkte coinHistory weg
  writeJSON(coinHistoryPath, coinHistory);
  console.log("✅ Report generated and saved to coinHistory.json");
}

// Plan de taak met cron: voer het script dagelijks om 23:00 uur uit
cron.schedule('0 23 * * *', () => {
  generateReport();
});

// Voor directe uitvoering (optioneel)
generateReport();
