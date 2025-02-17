const express = require("express");
const router = express.Router();
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const cron = require("node-cron");

// Pad naar de database-map en trending_votes databasebestand
const coinVotesDbDir = path.join(__dirname, "..", "public", "data");
const trendingVotesDbPath = path.join(coinVotesDbDir, "trending_votes.db");

// Open de database
const trendingVotesDb = new sqlite3.Database(trendingVotesDbPath, (err) => {
  if (err) {
    console.error("Error opening trending_votes database:", err.message);
  } else {
    console.log("Connected to trending_votes database at", trendingVotesDbPath);
  }
});

// Maak de trending_votes-tabel als deze nog niet bestaat
trendingVotesDb.serialize(() => {
    trendingVotesDb.run(`
      CREATE TABLE IF NOT EXISTS trending_votes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        coinId TEXT NOT NULL,
        userIdentifier TEXT NOT NULL,
        voteTime DATETIME DEFAULT CURRENT_TIMESTAMP,
        voteDate TEXT GENERATED ALWAYS AS (date(voteTime)) VIRTUAL,
        UNIQUE (coinId, userIdentifier, voteDate)
      )
    `, (err) => {
      if (err) {
        console.error("Error creating trending_votes table:", err.message);
      }
    });
  });  

// Endpoint: Voeg een stem toe voor een coin
router.post("/:coinId", (req, res) => {
  const coinId = req.params.coinId;
  // Haal userId uit de cookies
  const userId = req.cookies.userId;
  if (!userId) {
    return res.status(400).json({ error: "User not identified" });
  }
  const now = new Date();
  const query = `INSERT INTO trending_votes (coinId, userIdentifier, voteTime) VALUES (?, ?, ?)`;
  trendingVotesDb.run(query, [coinId, userId, now.toISOString()], function (err) {
    if (err) {
      if (err.message.includes("UNIQUE constraint failed")) {
        return res.status(429).json({ error: "Already voted today" });
      } else {
        console.error(err.message);
        return res.status(500).json({ error: "Database error" });
      }
    }
    trendingVotesDb.get(`SELECT COUNT(*) AS votes FROM trending_votes WHERE coinId = ?`, [coinId], (err, row) => {
      if (err) {
        console.error(err.message);
        return res.status(500).json({ error: "Database error" });
      }
      res.json({ coinId, votes: row.votes });
    });
  });
});

// Endpoint: Haal de top 10 trending coins op
router.get("/", (req, res) => {
  trendingVotesDb.all(
    `
    SELECT coinId, COUNT(*) AS votes 
    FROM trending_votes 
    GROUP BY coinId 
    ORDER BY votes DESC 
    LIMIT 10
  `,
    [],
    (err, rows) => {
      if (err) {
        console.error(err.message);
        return res.status(500).json({ error: "Database error" });
      }
      res.json(rows);
    }
  );
});

// Cronjob: Reset de trending votes elke week op zaterdag 23:00 UTC (oftewel zondag 00:00 UTC+1)
cron.schedule(
  "0 23 * * 6",
  () => {
    trendingVotesDb.run(`DELETE FROM trending_votes`, (err) => {
      if (err) {
        console.error("Error resetting trending votes:", err.message);
      } else {
        console.log("Trending votes have been reset.");
      }
    });
  },
  {
    scheduled: true,
    timezone: "UTC",
  }
);

module.exports = router;
