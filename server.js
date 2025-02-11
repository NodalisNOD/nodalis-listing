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

// ----- TWITTER/X API MET CACHING -----
let lastTweet = null;
let lastTweetFetchTime = 0;
const TWEET_CACHE_DURATION = 15 * 60 * 1000;
const twitterHandles = ["cryptocom", "onchain_wallet", "cronos_chain"];
const BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN;

app.get("/api/latest-tweet", async (req, res) => {
  const now = Date.now();
  if (lastTweet && now - lastTweetFetchTime < TWEET_CACHE_DURATION) {
    console.log("✅ Serving tweet from cache");
    return res.json(lastTweet);
  }
  try {
    let latestTweet = null;
    for (const handle of twitterHandles) {
      const userResponse = await axios.get(
        `https://api.twitter.com/2/users/by/username/${handle}?user.fields=profile_image_url`,
        { headers: { Authorization: `Bearer ${BEARER_TOKEN}` } }
      );
      const { id: userId, username, profile_image_url: profileImageUrl } = userResponse.data.data;
      const tweetsResponse = await axios.get(
        `https://api.twitter.com/2/users/${userId}/tweets?max_results=5&tweet.fields=created_at,attachments&expansions=attachments.media_keys&media.fields=url`,
        { headers: { Authorization: `Bearer ${BEARER_TOKEN}` } }
      );
      if (tweetsResponse.data.data && tweetsResponse.data.data.length > 0) {
        latestTweet = tweetsResponse.data.data[0];
        const tweetImageUrl = tweetsResponse.data.includes?.media?.[0]?.url || null;
        lastTweet = {
          tweet: latestTweet.text,
          created_at: latestTweet.created_at,
          username,
          profile_image_url: profileImageUrl,
          tweet_id: latestTweet.id,
          image_url: tweetImageUrl
        };
        lastTweetFetchTime = now;
        return res.json(lastTweet);
      }
    }
    res.status(404).json({ message: "No tweets found." });
  } catch (error) {
    console.error("Error fetching tweets:", error.response?.data || error.message);
    res.status(500).json({ message: "Failed to fetch tweets." });
  }
});

// ----- COIN API MET CACHING -----
let coinDataCache = null;
let lastCoinFetchTime = 0;
const COIN_CACHE_DURATION = 5 * 60 * 1000;

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

// ----- VOTING ROUTE VOOR TOKENS -----
const tokenVotes = {};
const voteTimestamps = {};

app.post("/votes/:tokenId/:type", (req, res) => {
  const { tokenId, type } = req.params;
  const userIp = req.ip;
  const now = Date.now();

  if (!tokenVotes[tokenId]) {
    tokenVotes[tokenId] = { positive: 0, negative: 0 };
  }

  if (voteTimestamps[userIp]?.[tokenId] && now - voteTimestamps[userIp][tokenId] < 24 * 60 * 60 * 1000) {
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
