const fs = require("fs");
const path = require("path");

function readJSON(filePath) {
    const fullPath = path.join(__dirname, filePath);
    if (!fs.existsSync(fullPath)) return [];
    return JSON.parse(fs.readFileSync(fullPath, "utf8"));
}

function writeJSON(filePath, data) {
    const fullPath = path.join(__dirname, filePath);
    
    // ✅ Zorg dat de directory bestaat voordat we schrijven
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(fullPath, JSON.stringify(data, null, 2), "utf8");
}

module.exports = { readJSON, writeJSON };
