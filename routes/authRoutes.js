const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");

// Importeer je auth controller
const authController = require("../controllers/authController");

// Multer configuratie voor profielafbeeldingen
const storage = multer.diskStorage({
  destination: "public/uploads/",
  filename: (req, file, cb) => {
    const userId = req.user ? req.user.userId : "unknown";
    cb(null, `profile-${userId}.jpg`);
  },
});
const upload = multer({ storage });

// Auth endpoints
router.post("/register", authController.register);
router.post("/login", authController.login);
router.get("/user", authController.authenticateToken, authController.getUserInfo);
router.get("/profile", authController.authenticateToken, authController.getProfile);
router.post("/update-bio", authController.authenticateToken, authController.updateBio);
router.post("/follow", authController.authenticateToken, authController.followUser);
router.post(
  "/upload-profile",
  authController.authenticateToken,
  upload.single("profilePicture"),
  authController.uploadProfilePicture
);

module.exports = router;
