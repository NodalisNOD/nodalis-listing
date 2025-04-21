const express = require('express');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const cron = require('node-cron');

// Router voor vote summary (top10) bestanden
const router = express.Router();

// Directory en bestandspaden
const dataDir = path.join(__dirname, '../public/data');
const trendingFile = path.join(dataDir, 'trending-top10.json');
const sentimentFile = path.join(dataDir, 'sentiment-top10.json');
const weeklyFile = path.join(dataDir, 'weekly-trending.json');

// Zorg dat de data-dir bestaat
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Helper: run sqlite-query als Promise
function runQuery(dbPath, sql) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, err => {
      if (err) return reject(err);
    });
    db.all(sql, [], (err, rows) => {
      db.close();
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// Helper om oude JSON in te lezen
function loadJson(filePath) {
  if (fs.existsSync(filePath)) {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
      return null;
    }
  }
  return null;
}

// Gemeenschappelijke update-functie
async function updateSummaries() {
  try {
    const now = new Date().toLocaleString('nl-BE', { timeZone: 'Europe/Brussels' });

    // --- Trending ---
    const prevTrending = loadJson(trendingFile) || { top: [] };
    const prevMap = Object.fromEntries(prevTrending.top.map(o => [o.id, o.votes]));
    const trendingRows = await runQuery(
      path.join(__dirname, '../public/data/trending_votes.db'),
      `SELECT coinId AS id, COUNT(*) AS votes
       FROM trending_votes
       GROUP BY coinId
       ORDER BY votes DESC
       LIMIT 10`
    );
    const trendingWithChange = trendingRows.map(r => ({
      id: r.id,
      votes: r.votes,
      change: r.votes - (prevMap[r.id] || 0)
    }));
    fs.writeFileSync(
      trendingFile,
      JSON.stringify({ timestamp: now, top: trendingWithChange }, null, 2)
    );
    console.log('✅ trending-top10.json bijgewerkt');

    // --- Sentiment ---
    const prevSentiment = loadJson(sentimentFile) || { top: [] };
    const prevSentMap = Object.fromEntries(
      prevSentiment.top.map(o => [o.id, { pct: o.positivePercentage, total: o.total }])
    );
    const sentimentRows = await runQuery(
      path.join(__dirname, '../public/data/coin_votes.db'),
      `SELECT coinId AS id,
              SUM(CASE WHEN voteType='positive' THEN 1 ELSE 0 END) AS pos,
              SUM(CASE WHEN voteType='negative' THEN 1 ELSE 0 END) AS neg
       FROM coin_votes
       GROUP BY coinId`
    );
    const sentimentWithChange = sentimentRows.map(r => {
      const total = r.pos + r.neg;
      const pct = total > 0 ? +(r.pos * 100 / total).toFixed(1) : 0;
      const prev = prevSentMap[r.id] || { pct: 0, total: 0 };
      return {
        id: r.id,
        total,
        positivePercentage: pct,
        changePct: +(pct - prev.pct).toFixed(1),
        changeTotal: total - prev.total
      };
    })
    .sort((a,b) => b.positivePercentage - a.positivePercentage)
    .slice(0, 10);
    fs.writeFileSync(
      sentimentFile,
      JSON.stringify({ timestamp: now, top: sentimentWithChange }, null, 2)
    );
    console.log('✅ sentiment-top10.json bijgewerkt');

  } catch (err) {
    console.error('❌ Fout in updateSummaries:', err);
  }
}

// Cron: dagelijks om 00:00 Brussel-tijd (laatste update vóór weekly)
cron.schedule('0 0 * * *', updateSummaries);

// Cron: weekly op zaterdag om 00:01 Brussel-tijd – schrijf permanente weekly JSON
cron.schedule('1 0 * * 6', () => {
  try {
    const now = new Date().toLocaleString('nl-BE', { timeZone: 'Europe/Brussels' });
    const data = loadJson(trendingFile) || { top: [] };
    fs.writeFileSync(
      weeklyFile,
      JSON.stringify({ timestamp: now, top: data.top }, null, 2)
    );
    console.log('✅ weekly-trending.json bijgewerkt');
  } catch (err) {
    console.error('❌ Fout in wekelijkse cron:', err);
  }
});

// Endpoints om JSON-bestanden te serveren
router.get('/trending-top10', (req, res) => {
  if (fs.existsSync(trendingFile)) res.sendFile(trendingFile);
  else res.status(404).json({ error: 'File not found' });
});
router.get('/sentiment-top10', (req, res) => {
  if (fs.existsSync(sentimentFile)) res.sendFile(sentimentFile);
  else res.status(404).json({ error: 'File not found' });
});
router.get('/weekly-trending', (req, res) => {
  if (fs.existsSync(weeklyFile)) res.sendFile(weeklyFile);
  else res.status(404).json({ error: 'File not found' });
});

module.exports = router;
