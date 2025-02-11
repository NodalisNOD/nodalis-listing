// scripts/socials/auth.js

async function loginUser(email, password) {
    try {
      const response = await fetch("http://localhost:3000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      if (!response.ok) {
        alert("❌ Login failed! Please check your credentials.");
        return;
      }
      const data = await response.json();
      console.log("✅ Token received on login:", data.token);
      localStorage.setItem("token", data.token);
      window.location.reload();
    } catch (error) {
      console.error("❌ Error during login:", error);
    }
  }
  
  async function registerUser(username, email, password) {
    try {
      const response = await fetch("http://localhost:3000/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password })
      });
      const data = await response.json();
      if (response.ok) {
        alert("✅ Registration successful! You can now log in.");
      } else {
        alert(`❌ Registration failed: ${data.message}`);
      }
    } catch (error) {
      console.error("❌ Error during registration:", error);
    }
  }
  
  function logoutUser() {
    localStorage.removeItem("token");
    alert("✅ Logged out!");
    window.location.reload();
  }
  
  // Make the functions globally available:
  window.loginUser = loginUser;
  window.registerUser = registerUser;
  window.logoutUser = logoutUser;
  