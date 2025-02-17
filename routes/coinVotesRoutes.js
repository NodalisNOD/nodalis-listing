const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const router = express.Router();
const fs = require("fs");

// Pad naar de database-map en databasebestand
const coinVotesDbDir = path.join(__dirname, "..", "public", "data");
const coinVotesDbPath = path.join(coinVotesDbDir, "coin_votes.db");

// Zorg dat de map bestaat
if (!fs.existsSync(coinVotesDbDir)) {
  fs.mkdirSync(coinVotesDbDir, { recursive: true });
  console.log(`Map aangemaakt: ${coinVotesDbDir}`);
}

// Open de database
const coinVotesDb = new sqlite3.Database(coinVotesDbPath, (err) => {
  if (err) {
    console.error("Error opening coin_votes database:", err.message);
  } else {
    console.log("Connected to coin_votes database at", coinVotesDbPath);
  }
});

// Maak de coin_votes-tabel als deze nog niet bestaat
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

// Endpoint: Haal stemmen voor een specifieke coin op
router.get("/:coinId", (req, res) => {
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

// Endpoint: Voeg een stem toe voor een specifieke coin
router.post("/:coinId/:type", (req, res) => {
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

module.exports = router;
