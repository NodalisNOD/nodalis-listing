// routes/ads.js

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Route: GET /api/ads
router.get('/api/ads', (req, res) => {
  // Bepaal het pad naar de map met advertenties
  const adsDirectory = path.join(__dirname, '..', 'public', 'assets', 'ADS', 'FrontCycle');

  fs.readdir(adsDirectory, (err, files) => {
    if (err) {
      return res.status(500).json({ error: 'Kan map niet uitlezen: ' + err });
    }
    // Filter alleen afbeeldingsbestanden (pas de extensies aan indien nodig)
    const imageFiles = files.filter(file => /\.(gif|jpg|jpeg|png|webp)$/i.test(file));
    res.json(imageFiles);
  });
});

module.exports = router;
