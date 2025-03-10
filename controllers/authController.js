// controllers/authController.js
const { readJSON, writeJSON } = require("../jsonHelper");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET;

// Registratie – gebruik 'portolios.json' als opslagbestand
function register(req, res) {
  const { username, email, password } = req.body;
  let portfolios = readJSON("public/data/portolios.json") || [];

  if (portfolios.some(u => u.email === email)) {
    return res.status(400).json({ message: "Email bestaat al!" });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const newUser = {
    id: uuidv4(),
    username,
    email,
    password: hashedPassword,
    portfolio: [], // Begin met een lege portfolio
    createdAt: new Date().toISOString()
  };

  portfolios.push(newUser);
  writeJSON("public/data/portolios.json", portfolios);

  res.status(201).json({
    message: "Account succesvol aangemaakt!",
    user: { id: newUser.id, username, email }
  });
}

// Inloggen (kan grotendeels ongewijzigd blijven)
function login(req, res) {
  const { email, password } = req.body;
  let portfolios = readJSON("public/data/portolios.json") || [];
  const user = portfolios.find(u => u.email === email);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(400).json({ message: "Invalid credentials" });
  }
  const token = jwt.sign(
    { userId: user.id, username: user.username, role: "user" },
    JWT_SECRET,
    { expiresIn: "1h" }
  );
  res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
}

// Exporteer functies (andere functies blijven hetzelfde)
module.exports = {
  register,
  login,
  // ... andere functies
};
