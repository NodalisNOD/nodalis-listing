// scripts/socials/user.js

async function getUserInfo() {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("🚨 No token found in localStorage!");
        return null;
      }
      const response = await fetch("http://localhost:3000/auth/user", {
        headers: { Authorization: `Bearer ${token.trim()}` }
      });
      if (!response.ok) {
        console.error("🚨 Unable to fetch user info! Status:", response.status);
        localStorage.removeItem("token");
        return null;
      }
      const data = await response.json();
      if (data.user) {
        console.log("📥 Logged in user:", data.user);
        updateUI();
        return data.user;
      } else {
        console.error("🚨 No valid user received!");
        return null;
      }
    } catch (error) {
      console.error("❌ Error fetching user info:", error);
      return null;
    }
  }
  
  async function fetchUserProfile() {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:3000/auth/profile", {
        headers: { Authorization: `Bearer ${token.trim()}` }
      });
      if (!response.ok) throw new Error("Failed to fetch profile");
      const user = await response.json();
      document.getElementById("username").innerText = user.username;
      document.getElementById("bio").innerText = user.bio || "No bio set";
      document.getElementById("followers").innerText = user.followers || 0;
      document.getElementById("following").innerText = user.following || 0;
      if (user.profilePicture) {
        document.getElementById("profilePicture").src = `http://localhost:3000/${user.profilePicture}`;
      }
    } catch (error) {
      console.error("❌ Error fetching profile:", error);
    }
  }
  
  async function updateBio() {
    const newBio = document.getElementById("newBio").value.trim();
    if (newBio.length > 20) {
      alert("🚨 Bio may contain a maximum of 20 characters.");
      return;
    }
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:3000/auth/update-bio", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token.trim()}`
        },
        body: JSON.stringify({ bio: newBio })
      });
      const data = await response.json();
      if (response.ok) {
        alert("✅ Bio updated successfully!");
        fetchUserProfile();
      } else {
        alert(`❌ Error: ${data.message}`);
      }
    } catch (error) {
      console.error("❌ Error updating bio:", error);
    }
  }
  
  async function uploadProfilePicture() {
    const fileInput = document.getElementById("profileUpload");
    if (!fileInput.files.length) {
      alert("🚨 Please select a file to upload.");
      return;
    }
    const formData = new FormData();
    formData.append("profilePicture", fileInput.files[0]);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:3000/auth/upload-profile", {
        method: "POST",
        headers: { Authorization: `Bearer ${token.trim()}` },
        body: formData
      });
      const data = await response.json();
      if (response.ok) {
        alert("✅ Profile picture uploaded successfully!");
        fetchUserProfile();
      } else {
        alert(`❌ Error: ${data.message}`);
      }
    } catch (error) {
      console.error("❌ Error uploading profile picture:", error);
    }
  }
  
  function updateUI() {
    const token = localStorage.getItem("token");
    const loginBtn = document.getElementById("loginBtn");
    const registerBtn = document.getElementById("registerBtn");
    const logoutBtn = document.getElementById("logoutBtn");
    const profileBtn = document.getElementById("profileBtn");
    const postForm = document.getElementById("postForm");
  
    if (token) {
      // Gebruiker is ingelogd: toon Logout en Profile, verberg Login en Register
      if (loginBtn) loginBtn.style.display = "none";
      if (registerBtn) registerBtn.style.display = "none";
      if (logoutBtn) logoutBtn.style.display = "block";
      if (profileBtn) profileBtn.style.display = "block";
      if (postForm) postForm.style.display = "block";
      fetchUserProfile();
    } else {
      // Gebruiker is niet ingelogd: toon Login en Register, verberg Logout en Profile
      if (loginBtn) loginBtn.style.display = "block";
      if (registerBtn) registerBtn.style.display = "block";
      if (logoutBtn) logoutBtn.style.display = "none";
      if (profileBtn) profileBtn.style.display = "none";
      if (postForm) postForm.style.display = "none";
    }
  }
  
  // Maak de functie globaal beschikbaar (als dat nog niet gebeurd is):
  window.updateUI = updateUI;
  
  
  // Make functions globally available:
  window.getUserInfo = getUserInfo;
  window.fetchUserProfile = fetchUserProfile;
  window.updateBio = updateBio;
  window.uploadProfilePicture = uploadProfilePicture;
  window.updateUI = updateUI;
  