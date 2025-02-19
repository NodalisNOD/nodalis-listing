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

// Bestand waarin globale vote-records worden opgeslagen
const VOTE_RECORDS_FILE = path.join(__dirname, "public", "data", "voteRecords.json");

// === CONTROLLERS ===
const authController = require("./controllers/authController");
const postController = require("./controllers/postController");
const userController = require("./controllers/userController");
const hashtagController = require("./controllers/hashtagController");
const moderatorController = require("./controllers/moderatorController");

// Haal de JWT_SECRET uit de omgeving
const JWT_SECRET = process.env.JWT_SECRET;
console.log("🔑 JWT_SECRET geladen:", JWT_SECRET);

// === EXPRESS APP INITIALISATIE ===
const app = express();
const PORT = process.env.PORT || 3001;

// === MIDDLEWARE ===
app.use(bodyParser.json());
app.use(cors());
app.use(express.static(path.join(__dirname, "public"), { maxAge: 0 }));
app.use("/uploads", express.static("public/uploads"));
app.use(cookieParser());
app.use(helmet());

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

// === ROUTES ===

// ----- AUTH ROUTES -----
app.post("/auth/register", authController.register);
app.post("/auth/login", authController.login);
app.get(
  "/auth/user",
  authController.authenticateToken,
  authController.getUserInfo
);
app.get("/hashtags/trending", hashtagController.getTrendingHashtags);
app.get(
  "/auth/profile",
  authController.authenticateToken,
  authController.getProfile
);
app.post(
  "/auth/update-bio",
  authController.authenticateToken,
  authController.updateBio
);
app.post(
  "/auth/follow",
  authController.authenticateToken,
  authController.followUser
);
app.post(
  "/auth/upload-profile",
  authController.authenticateToken,
  upload.single("profilePicture"),
  authController.uploadProfilePicture
);

// ----- POST ROUTES -----
app.post("/posts", authController.authenticateToken, postController.createPost);
app.get("/posts", postController.getPosts);
app.get("/users/:userId", userController.getUserById);
app.get("/posts/trending", postController.getTrendingPosts);
app.post("/posts/:postId/vote", postController.votePost);
app.post(
  "/posts/:postId/comments",
  authController.authenticateToken,
  postController.addComment
);
app.get("/posts/:postId", postController.getPostById);

// ----- COIN API MET CACHING -----
let coinDataCache = null;
let lastCoinFetchTime = 0;
const COIN_CACHE_DURATION = 10 * 60 * 1000; // 10 minuten

const fetchCoinData = async () => {
  try {
    const response = await axios.get(
      "https://api.geckoterminal.com/api/v2/networks/cro/pools/multi"
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching coin data:", error.message);
    return null;
  }
};

app.get("/api/coins", async (req, res) => {
  const now = Date.now();
  if (coinDataCache && now - lastCoinFetchTime < COIN_CACHE_DURATION) {
    console.log("✅ Serving coins from cache");
    return res.json(coinDataCache);
  }
  try {
    console.log("⏳ Fetching fresh coin data...");
    const coinData = await fetchCoinData();
    if (!coinData) {
      return res.status(500).json({ message: "Failed to fetch coin data" });
    }
    coinDataCache = coinData;
    lastCoinFetchTime = now;
    res.json(coinDataCache);
  } catch (error) {
    console.error("Error processing coin data:", error);
    res.status(500).json({ message: "Failed to process coin data" });
  }
});

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
    subject: `New Coin Listing Request: ${
      listingData.tokenName || "Unknown"
    }`,
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
    subject: `New Exchange Listing Request: ${
      listingData.exchangeName || "Unknown"
    }`,
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

// Routes importeren
const coingeckoRoutes = require('./routes/coingeckoRoutes');

// **Gebruik de CoinGecko routes onder /api/coingecko**
app.use('/api/coingecko', coingeckoRoutes);
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
    res.json(row);
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
// Gebruik de gemoduleerde trending votes routes
const trendingVotesRoutes = require("./routes/trendingVotesRoutes");
app.use("/trending", trendingVotesRoutes);

// === SERVER START ===
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server draait op http://0.0.0.0:${PORT}`);
});
