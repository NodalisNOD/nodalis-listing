function deletePost(req, res) {
    // Controleer of de gebruiker een moderator is
    if (req.user.role !== "moderator" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }
    // Verwijder de post uit de posts.json
    // ...
  }
  
  function deleteComment(req, res) {
    // Verwijder een reactie van een post
    // ...
  }
  
  module.exports = { deletePost, deleteComment };
  