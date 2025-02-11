const jwt = require("jsonwebtoken");

const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJiNmRjNmJlNC1hOTk3LTRhMGUtYjlkOC04OTRjZWNlNmJiNTciLCJyb2xlIjoidXNlciIsImlhdCI6MTczOTIyNDU0NSwiZXhwIjoxNzM5MjI4MTQ1fQ.ZVzuJt4ymY8td2O1mghmiKMBd0y5pImkHKedPUwEzYo";
const secret = "8/cRUfSi6v0lV6CvR8imNCHR6yx51NT5s4UHODnXd/0=";

jwt.verify(token, secret, (err, decoded) => {
  if (err) {
    console.error("Token is ongeldig:", err);
  } else {
    console.log("Token is geldig. Decoded:", decoded);
  }
});
