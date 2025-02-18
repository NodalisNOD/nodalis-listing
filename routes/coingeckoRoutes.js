const express = require('express');
const fetch = require('node-fetch');

const router = express.Router();

// ✅ Proxy route voor Exchange data van CoinGecko
router.get('/exchange', async (req, res) => {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/exchanges/ebisus-bay');
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Kan API niet laden' });
    }
});

// ✅ Proxy route voor BTC prijs in USD
router.get('/btcprice', async (req, res) => {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Kan BTC prijs niet laden' });
    }
});

module.exports = router;
