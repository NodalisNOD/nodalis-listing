const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const router = express.Router();
const fs = require("fs");

// Pad naar de database-map en databasebestand
const comVoteDbDir = path.join(__dirname, "..", "public", "data");
const comVoteDbPath = path.join(comVoteDbDir, "ComVotes.db");

// Zorg dat de map bestaat
if (!fs.existsSync(comVoteDbDir)) {
  fs.mkdirSync(comVoteDbDir, { recursive: true });
  console.log(`Map aangemaakt: ${comVoteDbDir}`);
}

// Open de database
const comVoteDb = new sqlite3.Database(comVoteDbPath, (err) => {
  if (err) {
    console.error("Fout bij het openen van de ComVotes database:", err.message);
  } else {
    console.log("Verbonden met de ComVotes database op", comVoteDbPath);
  }
});

// Maak de votes-tabel als deze nog niet bestaat
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

// Endpoint: Haal globale stemmen op
router.get("/", (req, res) => {
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

// Endpoint: Haal stemmen op voor een specifieke datum
router.get("/:date", (req, res) => {
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

// Endpoint: Voeg een nieuwe stem toe
router.post("/vote", (req, res) => {
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

// Endpoint: Flush (reset) alle globale stemmen
router.post("/flush", (req, res) => {
  comVoteDb.run("DELETE FROM votes", function (err) {
    if (err) {
      console.error("Error flushing global votes:", err.message);
      return res.status(500).json({ error: "Internal Server Error" });
    }
    console.log("Global votes flushed successfully.");
    res.json({ success: true });
  });
});

module.exports = router;
