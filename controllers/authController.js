// controllers/authController.js
const { readJSON, writeJSON } = require("../jsonHelper");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const multer = require("multer");
require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET;

// ✅ Middleware om JWT te verifiëren
// In je authController.js
function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  console.log("=== Received Authorization header:", authHeader);
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    console.error("Geen token gevonden in de header");
    return res.status(401).json({ message: "Geen token meegegeven" });
  }

  // Zorg dat je token wordt getrimd om eventuele extra spaties/newlines te verwijderen.
  jwt.verify(token.trim(), JWT_SECRET, (err, user) => {
    if (err) {
      console.error("❌ JWT Verificatiefout:", err);
      return res.status(403).json({ message: "Ongeldige token" });
    }
    req.user = user;
    next();
  });
}

// ✅ Registratie
function register(req, res) {
  const { username, email, password } = req.body;
  let users = readJSON("public/data/users.json");

  if (users.some((u) => u.email === email)) {
    return res.status(400).json({ message: "Email bestaat al!" });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const newUser = {
    id: uuidv4(),
    username,
    email,
    password: hashedPassword,
    verified: false,
    role: "user",
    bio: "",
    profilePicture: "",
    followers: [],
    following: []
  };

  users.push(newUser);
  writeJSON("public/data/users.json", users);

  res
    .status(201)
    .json({ message: "Account succesvol aangemaakt!", user: { id: newUser.id, username, email } });
}

// ✅ Inloggen
function login(req, res) {
  const { email, password } = req.body;
  const users = readJSON("public/data/users.json");
  const user = users.find(u => u.email === email);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(400).json({ message: "Invalid credentials" });
  }
  // Neem nu ook username mee in de token zodat je dit later kunt gebruiken
// In de login functie:
const token = jwt.sign({ userId: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: "1h" });
  res.json({ token });
}

// ✅ Gebruikersinfo ophalen
function getUserInfo(req, res) {
  const users = readJSON("public/data/users.json");
  const user = users.find((u) => u.id === req.user.userId);
  if (!user) return res.status(404).json({ message: "Gebruiker niet gevonden" });

  res.json({
    user: {  // <--- Verpak de gegevens in 'user'
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      verified: user.verified || false,
      bio: user.bio || "",
      profilePicture: user.profilePicture || "",
      followers: user.followers.length || 0,
      following: user.following.length || 0
    }
  });
}

// ✅ Profielfoto uploaden
const storage = multer.diskStorage({
  destination: "public/uploads/",
  filename: (req, file, cb) => {
    // Gebruik de userId uit de JWT (zorg dat authenticateToken vóór deze middleware draait)
    cb(null, `profile-${req.user.userId}.jpg`);
  }
});
const upload = multer({ storage });

function uploadProfilePicture(req, res) {
  let users = readJSON("public/data/users.json");
  let userIndex = users.findIndex((u) => u.id === req.user.userId);
  if (userIndex === -1) return res.status(404).json({ message: "Gebruiker niet gevonden!" });

  users[userIndex].profilePicture = `/uploads/profile-${req.user.userId}.jpg`;
  writeJSON("public/data/users.json", users);

  res.json({ message: "Profielfoto succesvol geüpload!", profilePicture: users[userIndex].profilePicture });
}

// ✅ Profielfoto / profielgegevens ophalen (getProfile)
function getProfile(req, res) {
  const users = readJSON("public/data/users.json");
  const user = users.find((u) => u.id === req.user.userId);
  if (!user) return res.status(404).json({ message: "Gebruiker niet gevonden" });

  res.json({
    id: user.id,
    username: user.username,
    bio: user.bio || "",
    profilePicture: user.profilePicture || "",
    followers: user.followers,
    following: user.following
  });
}

// ✅ Bio updaten
function updateBio(req, res) {
  const { bio } = req.body;
  let users = readJSON("public/data/users.json");
  const userIndex = users.findIndex((u) => u.id === req.user.userId);
  if (userIndex === -1) return res.status(404).json({ message: "Gebruiker niet gevonden" });

  users[userIndex].bio = bio;
  writeJSON("public/data/users.json", users);
  res.json({ message: "Bio succesvol geüpdatet", bio: users[userIndex].bio });
}

// ✅ Volgen/ontvolgen van een gebruiker
function followUser(req, res) {
  const { followId } = req.body; // ID van de gebruiker die gevolgd moet worden
  let users = readJSON("public/data/users.json");
  const currentUserIndex = users.findIndex(u => u.id === req.user.userId);
  if (currentUserIndex === -1) return res.status(404).json({ message: "User not found" });
  const currentUser = users[currentUserIndex];

  // Check of gebruiker al gevolgd wordt
  if (currentUser.following.includes(followId)) {
    // Ontvolg: verwijder followId
    currentUser.following = currentUser.following.filter(id => id !== followId);
    // Verwijder ook de volger uit de andere gebruiker
    const followeeIndex = users.findIndex(u => u.id === followId);
    if (followeeIndex !== -1) {
      users[followeeIndex].followers = users[followeeIndex].followers.filter(id => id !== currentUser.id);
    }
    writeJSON("public/data/users.json", users);
    return res.json({ message: "Unfollowed user" });
  } else {
    // Volg de gebruiker
    currentUser.following.push(followId);
    const followeeIndex = users.findIndex(u => u.id === followId);
    if (followeeIndex !== -1) {
      users[followeeIndex].followers.push(currentUser.id);
    }
    writeJSON("public/data/users.json", users);
    return res.json({ message: "Followed user" });
  }
}

// ✅ Exporteer alle functies
module.exports = {
  authenticateToken,
  register,
  login,
  getUserInfo,
  getProfile,
  updateBio,
  followUser,
  uploadProfilePicture,
  upload // Exporteren van de multer-middleware indien je die in de routes wilt gebruiken
};
