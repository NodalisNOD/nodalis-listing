const express = require("express");
const router = express.Router();

// Importeer controllers voor posts en auth
const postController = require("../controllers/postController");
const authController = require("../controllers/authController");

// Post endpoints
router.post("/", authController.authenticateToken, postController.createPost);
router.get("/", postController.getPosts);
router.get("/trending", postController.getTrendingPosts);
router.get("/:postId", postController.getPostById);
router.post("/:postId/vote", postController.votePost);
router.post("/:postId/comments", authController.authenticateToken, postController.addComment);

module.exports = router;
