// === MODULES & CONFIGURATIE ===
const helmet = require("helmet");
const express = require("express");
const path = require("path");
const fs = require("fs");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const nodemailer = require("nodemailer");
const multer = require("multer");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const cron = require("node-cron");
const cookieParser = require("cookie-parser");
const fetch = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args));

// Bestand waarin globale vote-records worden opgeslagen
const VOTE_RECORDS_FILE = path.join(__dirname, "public", "data", "voteRecords.json");



// Haal de JWT_SECRET uit de omgeving
const JWT_SECRET = process.env.JWT_SECRET;
console.log("🔑 JWT_SECRET geladen:", JWT_SECRET);

// === EXPRESS APP INITIALISATIE ===
const app = express();
const PORT = process.env.PORT || 3001;

// === ROUTES ===

// Importeer de ads-route
const spotlightRoute = require('./routes/spotlight');
app.use(spotlightRoute);

// === MIDDLEWARE ===
app.use(bodyParser.json());
app.use(cors());
app.use(express.static(path.join(__dirname, "public"), { maxAge: 0 }));
app.use("/uploads", express.static("public/uploads"));
app.use(cookieParser());
app.use(helmet());
app.use(express.static('public'));


// Indien er geen userId-cookie is, genereer deze
app.use((req, res, next) => {
  if (!req.cookies.userId) {
    const userId = "user_" + Math.random().toString(36).substr(2, 9);
    res.cookie("userId", userId, {
      maxAge: 365 * 24 * 60 * 60 * 1000,
      httpOnly: true,
    });
    req.cookies.userId = userId;
  }
  next();
});

// === MULTER CONFIGURATIE VOOR PROFIELAFBEELDINGEN ===
const storage = multer.diskStorage({
  destination: "public/uploads/",
  filename: (req, file, cb) => {
    const userId = req.user ? req.user.userId : "unknown";
    cb(null, `profile-${userId}.jpg`);
  },
});
const upload = multer({ storage });

// === GLOBALE VOTING VARIABELEN (voor community votes) ===
let globalVotes = { positive: 0, negative: 0 };
let tokenVotes = {};
let voteRecords = {};
let voteTimestamps = {};
let globalUserVotes = loadVoteRecords();

const VOTE_EXPIRATION_TIME = 24 * 60 * 60 * 1000; // 24 uur voor globale voting
const TOKEN_VOTE_EXPIRATION = 24 * 60 * 60 * 1000; // 24 uur voor token voting

// Functie om vote-records op te slaan
function saveVoteRecords() {
  try {
    const data = {
      globalVotes,
      tokenVotes,
      globalUserVotes: Object.fromEntries(globalUserVotes),
      voteTimestamps,
    };
    fs.writeFileSync(VOTE_RECORDS_FILE, JSON.stringify(data, null, 2));
    console.log("✅ Votes saved successfully!");
  } catch (error) {
    console.error("❌ Error saving votes:", error);
  }
}

// Functie om bestaande vote-records te laden
function loadVoteRecords() {
  try {
    if (fs.existsSync(VOTE_RECORDS_FILE)) {
      const data = fs.readFileSync(VOTE_RECORDS_FILE, "utf8");
      const parsed = JSON.parse(data);
      return new Map(Object.entries(parsed.globalUserVotes || {}));
    }
  } catch (error) {
    console.error("❌ Error loading vote records:", error);
  }
  return new Map();
}


// ----- COIN API MET SERVER-SIDE CACHING VIA CRON -----
// De server haalt elke 20 seconden de externe API-data op voor een chunk van 10 coins
// en slaat deze op in de cache. De cache wordt ook geschreven naar public/data/coinCache.json voor debug-doeleinden.

let coinDataCache = null;
let currentChunkIndex = 0;
const chunkSize = 10; // Verwerk 10 coins per update

// Laad de handmatige coin-data
const manualCoinDataPath = path.join(__dirname, "public", "data", "coin-data.json");
let manualCoinData = [];

try {
  manualCoinData = JSON.parse(fs.readFileSync(manualCoinDataPath, "utf8"));
  console.log("✅ Loaded manual coin data");
} catch (error) {
  console.error("❌ Error loading manual coin data:", error.message);
}

async function fetchGeneralApiData(url) {
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error(`❌ Error fetching data from ${url}:`, error.message);
    return null;
  }
}

async function updateCoinDataCache() {
  try {
    console.log("⏳ Updating coin data cache for a chunk...");

    const cachedData = coinDataCache || {};

    const totalCoins = manualCoinData.length;
    const totalChunks = Math.ceil(totalCoins / chunkSize);
    const start = currentChunkIndex * chunkSize;
    const end = start + chunkSize;
    const coinsToUpdate = manualCoinData.slice(start, end);

    console.log(`⏳ Processing chunk ${currentChunkIndex + 1} of ${totalChunks}: coins ${start} to ${end}`);

    for (const coin of coinsToUpdate) {
      const generalApiUrl = coin.dynamicData.generalApi;
      if (generalApiUrl) {
        console.log(`⏳ Fetching data for ${coin.name} from ${generalApiUrl}`);
        const data = await fetchGeneralApiData(generalApiUrl);

        const isValidData = data && (
          (Array.isArray(data) && data.length > 0) ||
          (typeof data === "object" && !Array.isArray(data) && Object.keys(data).length > 0)
        );

        if (isValidData) {
          cachedData[coin.id] = data;
          console.log(`✅ Fetched data for ${coin.name}`);
        } else {
          console.warn(`⚠️ Received empty data for ${coin.name}, keeping previous data (if any).`);
        }
      }
    }

    coinDataCache = cachedData;
    fs.writeFileSync(
      path.join(__dirname, "public", "data", "coinCache.json"),
      JSON.stringify(coinDataCache, null, 2)
    );
    console.log("✅ Coin data cache updated with current chunk");

    currentChunkIndex = (currentChunkIndex + 1) % totalChunks;
  } catch (error) {
    console.error("❌ Error updating coin data cache:", error.message);
  }
}

// Plan de taak om elke 20 seconden te draaien
cron.schedule("*/25 * * * * *", updateCoinDataCache);
// Update direct bij serverstart
updateCoinDataCache();

app.get("/api/coins", (req, res) => {
  if (coinDataCache) {
    console.log("✅ Serving filtered coin data from cache");
    res.json(coinDataCache);
  } else {
    res.status(503).json({ message: "Coin data not available yet" });
  }
});
const CACHE_DURATION = 30000; // 30 seconds in milliseconds
// Zorg dat de directory public/data bestaat
const dataDir = path.join(__dirname, 'public', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
const cacheFilePath = path.join(dataDir, 'croPrice.json');

// Functie om de Cronos market cap op te halen via Geckoterminal (ETH-netwerk endpoint)
async function fetchCronosMarketCap() {
  try {
    const response = await fetch("https://api.geckoterminal.com/api/v2/networks/eth/tokens/0xa0b73e1ff0b80914ab6fe0444e65848c4c34450b");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();

    // Pas de key aan indien nodig, bijvoorbeeld:
    const marketCap = parseFloat(data.data.attributes.market_cap_usd);
    if (isNaN(marketCap)) {
      throw new Error(`Invalid market cap value: ${data.data.attributes.market_cap_usd}`);
    }
    return marketCap;
  } catch (error) {
    console.error("Error fetching Cronos market cap:", error);
    return 0;
  }
}

// ----- EXCHANGE CACHE -----

// Variabele voor de exchange-cache
let exchangeDataCache = null;

// Pad naar de handmatige exchange data (exchanges.json)
const manualExchangesPath = path.join(__dirname, "public", "data", "exchanges.json");
let manualExchangeData = [];

try {
  manualExchangeData = JSON.parse(fs.readFileSync(manualExchangesPath, "utf8"));
  console.log("✅ Loaded manual exchange data");
} catch (error) {
  console.error("❌ Error loading manual exchange data:", error.message);
}

// Helper: Haal data op van een externe API URL (via Axios)
async function fetchExchangeApiData(url) {
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error(`❌ Error fetching data from ${url}:`, error.message);
    return null;
  }
}

// Update de exchange-cache door voor iedere exchange de API op te halen
async function updateExchangeDataCache() {
  try {
    console.log("⏳ Updating exchange data cache...");
    const cachedData = exchangeDataCache || {};

    // Itereer over alle exchanges uit de handmatige data
    for (const exchange of manualExchangeData) {
      const apiUrl = exchange.api_links && exchange.api_links.apiMain;
      if (apiUrl) {
        console.log(`⏳ Fetching data for ${exchange.name} from ${apiUrl}`);
        const data = await fetchExchangeApiData(apiUrl);

        // Als er geldige data is, sla deze op in de cache onder de exchange id
        if (data && Object.keys(data).length > 0) {
          cachedData[exchange.id] = data;
          console.log(`✅ Fetched data for ${exchange.name}`);
        } else {
          console.warn(`⚠️ Received empty data for ${exchange.name}, keeping previous data (if any).`);
        }
      }
    }

    exchangeDataCache = cachedData;
    // Schrijf de cache weg naar public/data/exchangeCache.json (voor debugging of client-side gebruik)
    const exchangeCachePath = path.join(__dirname, "public", "data", "exchangeCache.json");
    fs.writeFileSync(exchangeCachePath, JSON.stringify(exchangeDataCache, null, 2));
    console.log("✅ Exchange data cache updated.");
  } catch (error) {
    console.error("❌ Error updating exchange data cache:", error.message);
  }
}

// Plan de taak om elke 60 seconden de exchange-cache te updaten (pas de frequentie aan indien nodig)
cron.schedule("*/60 * * * * *", updateExchangeDataCache);
// Update direct bij serverstart
updateExchangeDataCache();

// Route: Serve de exchange-cache
app.get("/api/exchanges", (req, res) => {
  if (exchangeDataCache) {
    console.log("✅ Serving exchange data from cache");
    res.json(exchangeDataCache);
  } else {
    res.status(503).json({ message: "Exchange data not available yet" });
  }
});


// Functie om de Cronos-tokenprijs (en market cap) op te halen en te cachen
async function updateCroPrice() {
  try {
    // Haal tokenprijs op via het CRO-netwerk endpoint
    const response = await fetch("https://api.geckoterminal.com/api/v2/simple/networks/cro/token_price/0x5c7f8a570d578ed84e63fdfa7b1ee72deae1ae23");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    const tokenPriceStr = data.data.attributes.token_prices["0x5c7f8a570d578ed84e63fdfa7b1ee72deae1ae23"];
    const price = parseFloat(tokenPriceStr);
    if (isNaN(price)) {
      throw new Error(`Invalid price value: ${tokenPriceStr}`);
    }

    // Haal de Cronos market cap op
    const marketCap = await fetchCronosMarketCap();

    const cacheData = {
      cronosPrice: price,
      cronosMarketCap: marketCap,
      timestamp: Date.now()
    };

    await fs.promises.writeFile(cacheFilePath, JSON.stringify(cacheData, null, 2));
    console.log("✅ Cronos data updated:", cacheData);
  } catch (error) {
    console.error("Error updating Cronos data:", error);
  }
}

// Update direct bij serverstart en daarna elke CACHE_DURATION milliseconden
updateCroPrice();
setInterval(updateCroPrice, CACHE_DURATION);

// ----- LISTING FORM: COIN LISTING -----
app.post("/submit-coin-listing", (req, res) => {
  const listingData = req.body;
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  });
  const mailOptions = {
    from: "nodalisn@gmail.com",
    to: "nodalisn@gmail.com",
    subject: `New Coin Listing Request: ${listingData.tokenName || "Unknown"}`,
    text: `A new coin listing request has been submitted:\n\n${JSON.stringify(
      listingData,
      null,
      2
    )}`,
  };
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("❌ Email error:", error);
      return res.status(500).json({ message: "Failed to send email." });
    }
    res.json({ message: "Coin listing submitted successfully.", info });
  });
});

// ----- LISTING FORM: EXCHANGE LISTING -----
app.post("/submit-exchange-listing", (req, res) => {
  const listingData = req.body;
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  });
  const mailOptions = {
    from: "nodalisn@gmail.com",
    to: "nodalisn@gmail.com",
    subject: `New Exchange Listing Request: ${listingData.exchangeName || "Unknown"}`,
    text: `A new exchange listing request has been submitted:\n\n${JSON.stringify(
      listingData,
      null,
      2
    )}`,
  };
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("❌ Email error:", error);
      return res.status(500).json({ message: "Failed to send email." });
    }
    res.json({ message: "Exchange listing submitted successfully.", info });
  });
});

// ----- CONTACT FORM SUBMISSION -----
app.post("/submit-contact", async (req, res) => {
  const { name, email, subject, message } = req.body;
  if (!name || !email || !subject || !message) {
    return res.status(400).json({ message: "All fields are required!" });
  }
  console.log("📩 New Contact Message:");
  console.log(`From: ${name} (${email})`);
  console.log(`Subject: ${subject}`);
  console.log(`Message: ${message}`);
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  });
  const mailOptions = {
    from: email,
    to: "nodalisn@gmail.com",
    subject: `Contact Form Submission: ${subject}`,
    text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
  };
  try {
    await transporter.sendMail(mailOptions);
    res.json({ message: "Your message has been sent successfully!" });
  } catch (error) {
    console.error("❌ Email error:", error);
    res.status(500).json({ message: "Failed to send email." });
  }
});

// ----- COMVOTE ENDPOINTS (Globale community voting) -----
const comVoteRouter = express.Router();
const comVoteDbDir = path.join(__dirname, "public", "data");
const comVoteDbPath = path.join(comVoteDbDir, "ComVotes.db");
if (!fs.existsSync(comVoteDbDir)) {
  fs.mkdirSync(comVoteDbDir, { recursive: true });
  console.log(`Map aangemaakt: ${comVoteDbDir}`);
}
const comVoteDb = new sqlite3.Database(comVoteDbPath, (err) => {
  if (err) {
    console.error("Fout bij het openen van de ComVotes database:", err.message);
  } else {
    console.log("Verbonden met de ComVotes database op", comVoteDbPath);
  }
});
comVoteDb.serialize(() => {
  comVoteDb.run(
    `
    CREATE TABLE IF NOT EXISTS votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      voteType TEXT NOT NULL,
      voteTime DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `,
    (err) => {
      if (err) {
        console.error("Fout bij het aanmaken van de votes-tabel:", err.message);
      }
    }
  );
});
comVoteRouter.get("/votes", (req, res) => {
  comVoteDb.get(
    `
    SELECT 
      SUM(CASE WHEN voteType = 'positive' THEN 1 ELSE 0 END) AS positive,
      SUM(CASE WHEN voteType = 'negative' THEN 1 ELSE 0 END) AS negative,
      COUNT(*) AS total
    FROM votes
  `,
    (err, row) => {
      if (err) {
        console.error("Fout bij het ophalen van stemmen:", err.message);
        return res.status(500).json({ error: "Interne serverfout" });
      }
      res.json(row);
    }
  );
});
comVoteRouter.get("/votes/:date", (req, res) => {
  const date = req.params.date;
  comVoteDb.get(
    `
    SELECT 
      SUM(CASE WHEN voteType = 'positive' THEN 1 ELSE 0 END) AS positive,
      SUM(CASE WHEN voteType = 'negative' THEN 1 ELSE 0 END) AS negative,
      COUNT(*) AS total
    FROM votes
    WHERE date(voteTime) = ?
  `,
    [date],
    (err, row) => {
      if (err) {
        console.error("Fout bij het ophalen van stemmen per datum:", err.message);
        return res.status(500).json({ error: "Interne serverfout" });
      }
      res.json(row);
    }
  );
});
comVoteRouter.post("/vote", (req, res) => {
  const { voteType } = req.body;
  if (!voteType || (voteType !== "positive" && voteType !== "negative")) {
    return res.status(400).json({ error: "Ongeldig stemtype" });
  }
  const stmt = comVoteDb.prepare(`INSERT INTO votes (voteType) VALUES (?)`);
  stmt.run(voteType, function (err) {
    if (err) {
      console.error("Fout bij het invoegen van de stem:", err.message);
      return res.status(500).json({ error: "Interne serverfout" });
    }
    res.json({ success: true, id: this.lastID });
  });
  stmt.finalize();
});
app.use("/api/comvote", comVoteRouter);

// Flush endpoint: reset alle globale community votes
comVoteRouter.post("/flush", (req, res) => {
  comVoteDb.run("DELETE FROM votes", function (err) {
    if (err) {
      console.error("Error flushing global votes:", err.message);
      return res.status(500).json({ error: "Internal Server Error" });
    }
    console.log("Global votes flushed successfully.");
    res.json({ success: true });
  });
});

// ----- COIN VOTES ENDPOINTS (Permanente sentiment per coin) -----
const coinVotesRouter = express.Router();
const coinVotesDbDir = path.join(__dirname, "public", "data");
const coinVotesDbPath = path.join(coinVotesDbDir, "coin_votes.db");
if (!fs.existsSync(coinVotesDbDir)) {
  fs.mkdirSync(coinVotesDbDir, { recursive: true });
  console.log(`Map aangemaakt: ${coinVotesDbDir}`);
}
const coinVotesDb = new sqlite3.Database(coinVotesDbPath, (err) => {
  if (err) {
    console.error("Error opening coin_votes database:", err.message);
  } else {
    console.log("Connected to coin_votes database at", coinVotesDbPath);
  }
});
coinVotesDb.serialize(() => {
  coinVotesDb.run(
    `
    CREATE TABLE IF NOT EXISTS coin_votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      coinId TEXT NOT NULL,
      voteType TEXT NOT NULL,
      voteTime DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `,
    (err) => {
      if (err) {
        console.error("Error creating coin_votes table:", err.message);
      }
    }
  );
});
coinVotesRouter.get("/:coinId", (req, res) => {
  const coinId = req.params.coinId;
  const query = `
    SELECT 
      SUM(CASE WHEN voteType = 'positive' THEN 1 ELSE 0 END) AS positive,
      SUM(CASE WHEN voteType = 'negative' THEN 1 ELSE 0 END) AS negative
    FROM coin_votes
    WHERE coinId = ?
  `;
  coinVotesDb.get(query, [coinId], (err, row) => {
    if (err) {
      console.error("Error fetching coin votes:", err.message);
      return res.status(500).json({ error: "Internal Server Error" });
    }
    if (!row) row = { positive: 0, negative: 0 };
    row.total = (row.positive || 0) + (row.negative || 0);
    res.json({ votes: row });
  });
});
coinVotesRouter.post("/:coinId/:type", (req, res) => {
  const coinId = req.params.coinId;
  const type = req.params.type;
  if (type !== "positive" && type !== "negative") {
    return res.status(400).json({ error: "Invalid vote type" });
  }
  const query = `INSERT INTO coin_votes (coinId, voteType) VALUES (?, ?)`;
  coinVotesDb.run(query, [coinId, type], function (err) {
    if (err) {
      console.error("Error inserting coin vote:", err.message);
      return res.status(500).json({ error: "Internal Server Error" });
    }
    const selectQuery = `
      SELECT 
        SUM(CASE WHEN voteType = 'positive' THEN 1 ELSE 0 END) AS positive,
        SUM(CASE WHEN voteType = 'negative' THEN 1 ELSE 0 END) AS negative
      FROM coin_votes
      WHERE coinId = ?
    `;
    coinVotesDb.get(selectQuery, [coinId], (err, row) => {
      if (err) {
        console.error("Error fetching updated coin votes:", err.message);
        return res.status(500).json({ error: "Internal Server Error" });
      }
      if (!row) row = { positive: 0, negative: 0 };
      row.total = (row.positive || 0) + (row.negative || 0);
      res.json({ votes: row });
    });
  });
});
app.use("/votes", coinVotesRouter);

// ----- TRENDING VOTES ENDPOINTS -----
const trendingVotesRoutes = require("./routes/trendingVotesRoutes");
app.use("/trending", trendingVotesRoutes);

// ----- LISTING FORM: COIN LISTING -----
app.post("/submit-coin-listing", (req, res) => {
  const listingData = req.body;
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  });
  const mailOptions = {
    from: "nodalisn@gmail.com",
    to: "nodalisn@gmail.com",
    subject: `New Coin Listing Request: ${listingData.tokenName || "Unknown"}`,
    text: `A new coin listing request has been submitted:\n\n${JSON.stringify(
      listingData,
      null,
      2
    )}`,
  };
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("❌ Email error:", error);
      return res.status(500).json({ message: "Failed to send email." });
    }
    res.json({ message: "Coin listing submitted successfully.", info });
  });
});

// ----- LISTING FORM: EXCHANGE LISTING -----
app.post("/submit-exchange-listing", (req, res) => {
  const listingData = req.body;
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  });
  const mailOptions = {
    from: "nodalisn@gmail.com",
    to: "nodalisn@gmail.com",
    subject: `New Exchange Listing Request: ${listingData.exchangeName || "Unknown"}`,
    text: `A new exchange listing request has been submitted:\n\n${JSON.stringify(
      listingData,
      null,
      2
    )}`,
  };
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("❌ Email error:", error);
      return res.status(500).json({ message: "Failed to send email." });
    }
    res.json({ message: "Exchange listing submitted successfully.", info });
  });
});

// ----- CONTACT FORM SUBMISSION -----
app.post("/submit-contact", async (req, res) => {
  const { name, email, subject, message } = req.body;
  if (!name || !email || !subject || !message) {
    return res.status(400).json({ message: "All fields are required!" });
  }
  console.log("📩 New Contact Message:");
  console.log(`From: ${name} (${email})`);
  console.log(`Subject: ${subject}`);
  console.log(`Message: ${message}`);
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  });
  const mailOptions = {
    from: email,
    to: "nodalisn@gmail.com",
    subject: `Contact Form Submission: ${subject}`,
    text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
  };
  try {
    await transporter.sendMail(mailOptions);
    res.json({ message: "Your message has been sent successfully!" });
  } catch (error) {
    console.error("❌ Email error:", error);
    res.status(500).json({ message: "Failed to send email." });
  }
});

// === SERVER START ===
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server draait op http://0.0.0.0:${PORT}`);
});
