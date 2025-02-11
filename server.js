// server.js (relevant gedeelte)
const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const nodemailer = require("nodemailer");
const multer = require("multer");
require("dotenv").config();

// Controllers
const authController = require("./controllers/authController");
const postController = require("./controllers/postController");
const userController = require("./controllers/userController");
const hashtagController = require("./controllers/hashtagController");
const moderatorController = require("./controllers/moderatorController");

// Haal de JWT_SECRET uit de omgevingsvariabelen
const JWT_SECRET = process.env.JWT_SECRET;
console.log("🔑 JWT_SECRET geladen:", JWT_SECRET);

// Initialiseer de Express-app en stel de poort in
const app = express();
const PORT = process.env.PORT || 3001;
const cors = require("cors");

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
    // Zorg ervoor dat req.user beschikbaar is (bijv. via authenticateToken)
    const userId = req.user ? req.user.userId : "unknown";
    cb(null, `profile-${userId}.jpg`);
  }
});
const upload = multer({ storage });

// === MIDDLEWARE ===
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static("public/uploads"));

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
const COIN_CACHE_DURATION = 10 * 60 * 1000;

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
let globalUserVotes = new Map(); // Track welke gebruikers hebben gestemd

const VOTE_EXPIRATION_TIME = 24 * 60 * 60 * 1000; // 24 uur

// ✅ Fetch global votes
app.get("/votes/global", (req, res) => {
  res.json(globalVotes);
});

// ✅ Process global vote (alleen 1 stem per dag toegestaan)
app.post("/votes/global/:type", (req, res) => {
  const { type } = req.params;
  const userIp = req.ip; // Alternatief: gebruik echte user ID als je login hebt

  // ✅ Controleer of gebruiker al heeft gestemd binnen 24 uur
  if (globalUserVotes.has(userIp)) {
    const lastVoteTime = globalUserVotes.get(userIp);
    
    if (Date.now() - lastVoteTime < VOTE_EXPIRATION_TIME) {
      return res.status(429).json({ message: "🚫 You already voted today. Try again tomorrow.", votes: globalVotes });
    }
  }

  // ✅ Voeg de nieuwe stem toe
  if (type === "positive") {
    globalVotes.positive++;
  } else if (type === "negative") {
    globalVotes.negative++;
  } else {
    return res.status(400).json({ message: "Invalid vote type." });
  }

  // ✅ Registreer stem en timestamp
  globalUserVotes.set(userIp, Date.now());

  res.json({ message: "✅ Your vote has been recorded.", votes: globalVotes });
});

// ----- PER COIN VOTING -----
const tokenVotes = {};
const voteTimestamps = {};
const VOTE_RESET_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

app.post("/votes/:tokenId/:type", (req, res) => {
  const { tokenId, type } = req.params;
  const userIp = req.ip;
  const now = Date.now();

  if (!tokenVotes[tokenId]) {
    tokenVotes[tokenId] = { positive: 0, negative: 0 };
  }

  if (voteTimestamps[userIp]?.[tokenId] && now - voteTimestamps[userIp][tokenId] < VOTE_RESET_INTERVAL) {
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

// Reset votes every 24 hours
setInterval(() => {
  for (const tokenId in tokenVotes) {
    tokenVotes[tokenId] = { positive: 0, negative: 0 };
  }
  for (const userIp in voteTimestamps) {
    voteTimestamps[userIp] = {};
  }
  globalVotes = { positive: 0, negative: 0 };
  globalUserVotes.clear();
  console.log("Votes have been reset.");
}, VOTE_RESET_INTERVAL);

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

app.get("/latest-tweet", async (req, res) => {
  const twitterUser = "cryptocom"; // Replace with the actual Twitter username
  const tweetPageUrl = `https://nitter.net/${twitterUser}`;

  try {
    // Scrape Nitter instead of Twitter (bypass rate limits)
    const response = await axios.get(tweetPageUrl);
    const html = response.data;

    // Find the first tweet ID
    const tweetIdMatch = html.match(/status\/(\d+)/);
    if (!tweetIdMatch) throw new Error("No tweet ID found");

    const tweetId = tweetIdMatch[1];

    // Fetch the oEmbed HTML
    const oembedResponse = await axios.get(`https://publish.twitter.com/oembed?url=https://twitter.com/${twitterUser}/status/${tweetId}&maxwidth=500`);
    res.json(oembedResponse.data);
  } catch (error) {
    console.error("❌ Error fetching tweet:", error.message);
    res.status(500).json({ error: "Failed to fetch latest tweet" });
  }
});

// Contact Form Submission Route
app.post("/submit-contact", async (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !subject || !message) {
      return res.status(400).json({ message: "All fields are required!" });
  }

  console.log("📩 New Contact Message:");
  console.log(`From: ${name} (${email})`);
  console.log(`Subject: ${subject}`);
  console.log(`Message: ${message}`);

  // Nodemailer configureren
  const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
          user: process.env.GMAIL_USER,  // Zorg ervoor dat dit in je .env-bestand staat
          pass: process.env.GMAIL_PASS
      }
  });

  const mailOptions = {
      from: email,
      to: "nodalisn@gmail.com", // Vervang dit met jouw e-mailadres
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
app.listen(PORT, () => {
  console.log(`✅ Server draait op http://localhost:${PORT}`);
});
