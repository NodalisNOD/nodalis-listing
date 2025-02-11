// controllers/userController.js
const { readJSON } = require("../jsonHelper");

function getUserById(req, res) {
  const { userId } = req.params;
  const users = readJSON("public/data/users.json") || [];
  const user = users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json(user);
}

module.exports = { getUserById };
