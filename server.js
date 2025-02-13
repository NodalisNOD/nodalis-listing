// === MODULES & CONFIGURATIE ===
const express = require("express");
const path = require("path");
const fs = require("fs");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const nodemailer = require("nodemailer");
const multer = require("multer");
const cors = require("cors");
const cron = require("node-cron");
const AdmZip = require("adm-zip");
require("dotenv").config();

// === CONTROLLERS ===
const authController = require("./controllers/authController");
const postController = require("./controllers/postController");
const userController = require("./controllers/userController");
const hashtagController = require("./controllers/hashtagController");
const moderatorController = require("./controllers/moderatorController");

// Haal de JWT_SECRET uit de omgevingsvariabelen
const JWT_SECRET = process.env.JWT_SECRET;
console.log("🔑 JWT_SECRET geladen:", JWT_SECRET);

// Initialiseer Express-app en poort
const app = express();
const PORT = process.env.PORT || 3001;

// === MIDDLEWARE ===
app.use(bodyParser.json());
app.use(cors());
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static("public/uploads"));

// === POSTHOG ANALYTICS ===
const { PostHog } = require("posthog-node");
const posthog = new PostHog("phc_4GifZdg799FxUjonRWB7EpOowLNpzA", {
  host: "https://eu.i.posthog.com",
});
posthog.capture({
  distinctId: "server_event",
  event: "server_started",
  properties: { env: process.env.NODE_ENV },
});
console.log("✅ PostHog Server Analytics actief");
process.on("exit", () => posthog.shutdown());

// === MULTER CONFIGURATIE VOOR PROFIELAFBEELDINGEN ===
const storage = multer.diskStorage({
  destination: "public/uploads/",
  filename: (req, file, cb) => {
    // Zorg dat req.user beschikbaar is (bijv. via authenticateToken)
    const userId = req.user ? req.user.userId : "unknown";
    cb(null, `profile-${userId}.jpg`);
  }
});
const upload = multer({ storage });

// ==== GLOBALE VARIABELEN VOOR VOTING ====
// Globale sentiment votes
let globalVotes = { positive: 0, negative: 0 };
// Per-token votes (let zodat we later eventueel kunnen herschrijven)
let tokenVotes = {};
// Om individuele token-vote tijdstempels op te slaan
let voteRecords = {};
// Indien nodig voor andere vote-tijdstempels (bijvoorbeeld voor reset)
let voteTimestamps = {};
// Om globale votes op IP-basis bij te houden
const globalUserVotes = new Map();

const VOTE_EXPIRATION_TIME = 24 * 60 * 60 * 1000; // 24 uur voor globale voting
const TOKEN_VOTE_EXPIRATION = 24 * 60 * 60 * 1000; // 24 uur voor token voting

// ==== FUNCTIE OM VOTES OP TE SLAAN ====
function saveVoteRecords() {
  try {
    const data = {
      globalVotes,
      tokenVotes,
      globalUserVotes: Object.fromEntries(globalUserVotes), // Converteer Map naar object
      voteTimestamps
    };
    const voteRecordsFile = path.join(__dirname, "public", "data", "voteRecords.json");
    fs.writeFileSync(voteRecordsFile, JSON.stringify(data, null, 2));
    console.log("✅ Votes saved successfully!");
  } catch (error) {
    console.error("❌ Error saving votes:", error);
  }
}

// ==== ROUTES ====

// ----- AUTH ROUTES -----
app.post("/auth/register", authController.register);
app.post("/auth/login", authController.login);
app.get("/auth/user", authController.authenticateToken, authController.getUserInfo);
app.get("/hashtags/trending", hashtagController.getTrendingHashtags);
app.get("/auth/profile", authController.authenticateToken, authController.getProfile);
app.post("/auth/update-bio", authController.authenticateToken, authController.updateBio);
app.post("/auth/follow", authController.authenticateToken, authController.followUser);
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
app.post("/posts/:postId/comments", authController.authenticateToken, postController.addComment);
app.get("/posts/:postId", postController.getPostById);

// ----- COIN API MET CACHING -----
let coinDataCache = null;
let lastCoinFetchTime = 0;
const COIN_CACHE_DURATION = 10 * 60 * 1000; // 10 minuten

const fetchCoinData = async () => {
  try {
    const response = await axios.get("https://api.geckoterminal.com/api/v2/networks/cro/pools/multi");
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

// ----- GLOBAL SENTIMENT VOTING -----
app.post("/votes/global/:type", (req, res) => {
  const { type } = req.params;
  const userIp = req.ip;
  const now = Date.now();

  // Check of de gebruiker al gestemd heeft
  if (globalUserVotes.has(userIp)) {
    const lastVoteTime = globalUserVotes.get(userIp);
    const timeSinceLastVote = now - lastVoteTime;
    console.log(`🛠️ Last vote time: ${new Date(lastVoteTime).toISOString()} (Time since: ${timeSinceLastVote}ms)`);
    if (timeSinceLastVote < VOTE_EXPIRATION_TIME) {
      return res.status(429).json({ message: "🚫 You already voted today. Try again tomorrow." });
    }
  }

  // Verwerk de stem als er nog niet gestemd is of als de tijdsperiode verstreken is
  if (type === "positive") {
    globalVotes.positive++;
  } else if (type === "negative") {
    globalVotes.negative++;
  } else {
    return res.status(400).json({ message: "Invalid vote type." });
  }

  // Sla de nieuwe stemtijd op
  globalUserVotes.set(userIp, now);
  console.log(`✅ Vote recorded for IP ${userIp}: ${type}`);

  res.json({ message: "✅ Your vote has been recorded.", votes: globalVotes });
});


// ----- PER COIN VOTING -----
app.post("/votes/:tokenId/:type", (req, res) => {
  const { tokenId, type } = req.params;
  const userIp = req.ip;
  const userAgent = req.headers["user-agent"] || "unknown";
  const uniqueId = `${userIp}-${userAgent}`;

  if (!voteRecords[tokenId]) {
    voteRecords[tokenId] = {};
  }

  if (voteRecords[tokenId][uniqueId] && Date.now() - voteRecords[tokenId][uniqueId] < TOKEN_VOTE_EXPIRATION) {
    return res.status(429).json({ message: "🚫 You already voted for this token today. Try again tomorrow." });
  }

  if (!tokenVotes[tokenId]) {
    tokenVotes[tokenId] = { positive: 0, negative: 0 };
  }

  if (type === "positive") {
    tokenVotes[tokenId].positive++;
  } else if (type === "negative") {
    tokenVotes[tokenId].negative++;
  } else {
    return res.status(400).json({ message: "Invalid vote type." });
  }

  voteRecords[tokenId][uniqueId] = Date.now();
  saveVoteRecords();

  res.json({ message: "✅ Your vote has been recorded.", votes: tokenVotes[tokenId] });
});

app.get("/votes/:tokenId", (req, res) => {
  const { tokenId } = req.params;
  res.json(tokenVotes[tokenId] || { positive: 0, negative: 0 });
});

// ----- ARCHIVE VOTES -----
const dataDir = path.join(__dirname, "public", "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

function archiveVotes() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10); // Format: YYYY-MM-DD
  const filename = `votes-${dateStr}.json`;
  const filePath = path.join(dataDir, filename);

  const archiveData = {
    timestamp: now,
    globalVotes,
    tokenVotes
  };

  try {
    fs.writeFileSync(filePath, JSON.stringify(archiveData, null, 2));
    console.log(`Votes archived to ${filename}`);

    const zip = new AdmZip();
    zip.addLocalFile(filePath);
    const zipFilePath = filePath.replace('.json', '.zip');
    zip.writeZip(zipFilePath);
    console.log(`Votes zipped to ${path.basename(zipFilePath)}`);

    fs.unlinkSync(filePath);
  } catch (error) {
    console.error("Error archiving votes:", error);
  }
}

// Optioneel: functie om votes in het geheugen te resetten
function resetVotes() {
  globalVotes = { positive: 0, negative: 0 };
  globalUserVotes.clear();
  for (const tokenId in tokenVotes) {
    tokenVotes[tokenId] = { positive: 0, negative: 0 };
  }
  for (const userIp in voteTimestamps) {
    voteTimestamps[userIp] = {};
  }
  console.log("Votes have been reset.");
}

// Plan een cronjob om dagelijks votes te resetten en te archiveren
cron.schedule("0 0 * * *", () => {
  console.log("🔄 Resetting daily votes...");
  globalVotes = { positive: 0, negative: 0 };
  tokenVotes = {};
  voteRecords = {};
  saveVoteRecords();
  archiveVotes();
}, {
  timezone: "Europe/Amsterdam"
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
    subject: `New Coin Listing Request: ${listingData.tokenName || "Unknown"}`,
    text: `A new coin listing request has been submitted:\n\n${JSON.stringify(listingData, null, 2)}`,
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
    text: `A new exchange listing request has been submitted:\n\n${JSON.stringify(listingData, null, 2)}`,
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
          pass: process.env.GMAIL_PASS
      }
  });

  const mailOptions = {
      from: email,
      to: "nodalisn@gmail.com",
      subject: `Contact Form Submission: ${subject}`,
      text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`
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
