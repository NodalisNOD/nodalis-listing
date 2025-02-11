// controllers/hashtagController.js
const { readJSON } = require("../jsonHelper");

function getTrendingHashtags(req, res) {
  const posts = readJSON("public/data/posts.json") || [];
  const hashtagCounts = {};
  
  posts.forEach(post => {
    const matches = post.content.match(/#(\w+)/g);
    if (matches) {
      matches.forEach(tag => {
        hashtagCounts[tag] = (hashtagCounts[tag] || 0) + 1;
      });
    }
  });
  
  const trending = Object.entries(hashtagCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([tag, count]) => ({ tag, count }));
  
  res.json(trending);
}

module.exports = { getTrendingHashtags };
