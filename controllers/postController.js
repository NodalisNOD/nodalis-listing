// controllers/postController.js
const { readJSON, writeJSON } = require("../jsonHelper");

// Maak een post aan en sla deze op
function createPost(req, res) {
  const { content } = req.body;
  const posts = readJSON("public/data/posts.json") || [];
  
  // Definieer een cooldown van 60 seconden (60000 ms)
  const COOLDOWN = 60000;
  const now = Date.now();
  
  // Filter alle posts van de huidige gebruiker
  const userPosts = posts.filter(post => post.author && post.author.id === req.user.userId);
  if (userPosts.length > 0) {
    const latestPostTime = Math.max(...userPosts.map(post => new Date(post.timestamp).getTime()));
    if (now - latestPostTime < COOLDOWN) {
      return res.status(429).json({ message: "Please wait before creating another post." });
    }
  }
  
  const newPost = {
    id: Date.now().toString(),
    content,
    author: {
      id: req.user.userId,
      username: req.user.username
    },
    upvotes: 0,
    downvotes: 0,
    timestamp: new Date().toISOString(),
    comments: [],
    votes: {}  // Voor het bijhouden van stemmen per gebruiker
  };
  
  posts.push(newPost);
  writeJSON("public/data/posts.json", posts);
  res.status(201).json({ message: "Post created", post: newPost });
}

// Haal alle posts op
function getPosts(req, res) {
  const posts = readJSON("public/data/posts.json") || [];
  res.json(posts);
}

// Verwerk stemmen op een post (met beperking op één stem per gebruiker)
function votePost(req, res) {
  const { postId } = req.params;
  const { userId, type } = req.body;
  let posts = readJSON("public/data/posts.json") || [];
  const postIndex = posts.findIndex(p => p.id === postId);
  if (postIndex === -1) return res.status(404).json({ message: "Post niet gevonden" });
  
  if (!posts[postIndex].votes) {
    posts[postIndex].votes = {};
  }
  if (posts[postIndex].votes[userId] === type) {
    return res.status(400).json({ message: "Je hebt al deze stem gegeven" });
  }
  posts[postIndex].votes[userId] = type;
  
  let upvotes = 0, downvotes = 0;
  Object.keys(posts[postIndex].votes).forEach(uid => {
    if (posts[postIndex].votes[uid] === "upvote") upvotes++;
    else if (posts[postIndex].votes[uid] === "downvote") downvotes++;
  });
  posts[postIndex].upvotes = upvotes;
  posts[postIndex].downvotes = downvotes;
  
  writeJSON("public/data/posts.json", posts);
  res.json({ message: "Stem verwerkt", post: posts[postIndex] });
}

/// Voeg een comment toe aan een post (met cooldown)
function addComment(req, res) {
  const { postId } = req.params;
  const { comment } = req.body; // verwacht { comment: "your comment" }
  let posts = readJSON("public/data/posts.json") || [];
  const postIndex = posts.findIndex(p => p.id === postId);
  if (postIndex === -1) return res.status(404).json({ message: "Post not found" });
  
  if (!comment || comment.trim() === "") {
    return res.status(400).json({ message: "Empty comment not allowed" });
  }
  
  // Definieer een cooldown voor comments (bijv. 30 seconden = 30000 ms)
  const COOLDOWN_COMMENT = 30000;
  const now = Date.now();
  
  // Zorg dat de comments property een array is
  if (!Array.isArray(posts[postIndex].comments)) {
    posts[postIndex].comments = [];
  }
  
  // Zoek naar comments van deze gebruiker in deze post (op basis van username)
  const userComments = posts[postIndex].comments.filter(c => c.author === (req.user ? req.user.username : "Unknown"));
  if (userComments.length > 0) {
    const latestCommentTime = Math.max(...userComments.map(c => new Date(c.timestamp || 0).getTime()));
    if (now - latestCommentTime < COOLDOWN_COMMENT) {
      return res.status(429).json({ message: "Please wait before adding another comment." });
    }
  }
  
  const newComment = {
    author: req.user ? req.user.username : "Unknown",
    content: comment.trim(),
    timestamp: new Date().toISOString()
  };
  
  posts[postIndex].comments.push(newComment);
  writeJSON("public/data/posts.json", posts);
  res.json({ message: "Comment added", post: posts[postIndex] });
}

// Haal een enkele post op aan de hand van zijn ID
function getPostById(req, res) {
  const { postId } = req.params;
  const posts = readJSON("public/data/posts.json") || [];
  const post = posts.find(p => p.id === postId);
  if (!post) return res.status(404).json({ message: "Post niet gevonden" });
  res.json(post);
}

function getTrendingPosts(req, res) {
  let posts = readJSON("public/data/posts.json") || [];
  // Sorteren op basis van upvotes (en eventueel views als je dat bijhoudt)
  posts.sort((a, b) => b.upvotes - a.upvotes);
  res.json(posts);
}

module.exports = {
  createPost,
  getPosts,
  votePost,
  addComment,
  getPostById,
  getTrendingPosts
};
