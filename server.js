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

// === ROUTES ===

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
let globalVotes = { positive: 0, negative: 0 };
let globalUserVotes = new Map(); // Houd bij welke gebruikers gestemd hebben
const VOTE_EXPIRATION_TIME = 24 * 60 * 60 * 1000; // 24 uur

// Fetch global votes
app.get("/votes/global", (req, res) => {
  res.json(globalVotes);
});

// Process global vote (1 stem per 24 uur per gebruiker)
app.post("/votes/global/:type", (req, res) => {
  const { type } = req.params;
  const userIp = req.ip;

  // Controleer of gebruiker al gestemd heeft binnen 24 uur
  if (globalUserVotes.has(userIp)) {
    const lastVoteTime = globalUserVotes.get(userIp);
    if (Date.now() - lastVoteTime < VOTE_EXPIRATION_TIME) {
      return res.status(429).json({ message: "🚫 You already voted today. Try again tomorrow.", votes: globalVotes });
    }
  }

  // Voeg de nieuwe stem toe
  if (type === "positive") {
    globalVotes.positive++;
  } else if (type === "negative") {
    globalVotes.negative++;
  } else {
    return res.status(400).json({ message: "Invalid vote type." });
  }

  // Registreer stem en timestamp
  globalUserVotes.set(userIp, Date.now());
  res.json({ message: "✅ Your vote has been recorded.", votes: globalVotes });
});

// ----- PER COIN VOTING -----
const tokenVotes = {};
const voteTimestamps = {};
const TOKEN_VOTE_EXPIRATION = 24 * 60 * 60 * 1000; // 24 uur

app.post("/votes/:tokenId/:type", (req, res) => {
  const { tokenId, type } = req.params;
  const userIp = req.ip;
  const now = Date.now();

  if (!tokenVotes[tokenId]) {
    tokenVotes[tokenId] = { positive: 0, negative: 0 };
  }

  if (voteTimestamps[userIp]?.[tokenId] && now - voteTimestamps[userIp][tokenId] < TOKEN_VOTE_EXPIRATION) {
    return res.status(429).json({ message: "You can only vote once every 24 hours for this token." });
  }

  if (type === "positive") {
    tokenVotes[tokenId].positive++;
  } else if (type === "negative") {
    tokenVotes[tokenId].negative++;
  } else {
    return res.status(400).json({ message: "Invalid vote type." });
  }

  voteTimestamps[userIp] = { ...voteTimestamps[userIp], [tokenId]: now };
  res.json({ message: "Vote recorded successfully.", votes: tokenVotes[tokenId] });
});

app.get("/votes/:tokenId", (req, res) => {
  const { tokenId } = req.params;
  if (!tokenVotes[tokenId]) {
    return res.json({ positive: 0, negative: 0 });
  }
  res.json(tokenVotes[tokenId]);
});

// ----- ARCHIVERING & RESET VAN STEMMEN -----

// Zorg dat de data-directory bestaat
const dataDir = path.join(__dirname, "public", "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Archiveer de huidige stemdata in een JSON-bestand, zip deze en verwijder het originele JSON-bestand.
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

    // Zippen
    const zip = new AdmZip();
    zip.addLocalFile(filePath);
    const zipFilePath = filePath.replace('.json', '.zip');
    zip.writeZip(zipFilePath);
    console.log(`Votes zipped to ${path.basename(zipFilePath)}`);

    // Verwijder het originele JSON-bestand
    fs.unlinkSync(filePath);
  } catch (error) {
    console.error("Error archiving votes:", error);
  }
}

// Reset de in-memory stemdata
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

// Verwijder gezipte archieven ouder dan 3 dagen
function cleanupOldArchives() {
  fs.readdir(dataDir, (err, files) => {
    if (err) {
      console.error("Error reading data directory:", err);
      return;
    }
    files.forEach(file => {
      if (file.endsWith('.zip')) {
        const filePath = path.join(dataDir, file);
        fs.stat(filePath, (err, stats) => {
          if (err) {
            console.error("Error stating file:", filePath, err);
            return;
          }
          const fileAge = Date.now() - stats.mtimeMs;
          const threeDays = 3 * 24 * 60 * 60 * 1000;
          if (fileAge > threeDays) {
            fs.unlink(filePath, err => {
              if (err) console.error("Error deleting file:", filePath, err);
              else console.log("Deleted old archive:", file);
            });
          }
        });
      }
    });
  });
}

// Plan een cronjob die elke dag om middernacht (Europe/Amsterdam) de stemmen archiveert en reset.
cron.schedule('0 0 * * *', () => {
  console.log("Running daily archive and reset task");
  archiveVotes();
  resetVotes();
}, {
  timezone: "Europe/Amsterdam"
});

// Plan een cronjob die dagelijks de oude archieven opruimt (bijv. om 01:00 uur).
cron.schedule('0 1 * * *', cleanupOldArchives, {
  timezone: "Europe/Amsterdam"
});

// ----- OVERIGE ROUTES -----

// LISTING FORM: COIN LISTING
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

// LISTING FORM: EXCHANGE LISTING
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

// Latest Tweet ophalen via Nitter (om rate limits te omzeilen)
app.get("/latest-tweet", async (req, res) => {
  const twitterUser = "cryptocom"; // Vervang met de gewenste Twitter gebruikersnaam
  const tweetPageUrl = `https://nitter.net/${twitterUser}`;

  try {
    const response = await axios.get(tweetPageUrl);
    const html = response.data;

    // Zoek de eerste tweet ID
    const tweetIdMatch = html.match(/status\/(\d+)/);
    if (!tweetIdMatch) throw new Error("No tweet ID found");

    const tweetId = tweetIdMatch[1];
    const oembedResponse = await axios.get(`https://publish.twitter.com/oembed?url=https://twitter.com/${twitterUser}/status/${tweetId}&maxwidth=500`);
    res.json(oembedResponse.data);
  } catch (error) {
    console.error("❌ Error fetching tweet:", error.message);
    res.status(500).json({ error: "Failed to fetch latest tweet" });
  }
});

// Contact Form Submission
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
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server draait op http://0.0.0.0:${PORT}`);
});
