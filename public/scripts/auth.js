// public/scripts/auth.js

// Login via Google
// Verwacht dat de Google OAuth flow de client een id-token oplevert
async function loginWithGoogle(googleIdToken) {
    try {
      const response = await fetch("/auth/social/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: googleIdToken })
      });
      if (!response.ok) {
        alert("❌ Google login failed!");
        return;
      }
      const data = await response.json();
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      window.location.href = "portfolio.html";
    } catch (error) {
      console.error("❌ Error during Google login:", error);
    }
  }
  
  // Login via MetaMask
  // Vraagt toegang tot MetaMask, laat de gebruiker een bericht ondertekenen en stuurt account en signature naar de server
  async function loginWithMetaMask() {
    if (typeof window.ethereum === 'undefined') {
      alert("MetaMask is not installed.");
      return;
    }
    try {
      // Vraag toegang tot MetaMask-accounts
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const account = accounts[0];
  
      // Laat de gebruiker een bericht ondertekenen
      const message = "Please sign this message to log in to Nodalis Listing.";
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, account]
      });
  
      // Stuur account en signature naar de server voor verificatie
      const response = await fetch("/auth/social/metamask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account, signature })
      });
      if (!response.ok) {
        alert("❌ MetaMask login failed!");
        return;
      }
      const data = await response.json();
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      window.location.href = "portfolio.html";
    } catch (error) {
      console.error("❌ Error during MetaMask login:", error);
    }
  }
  
  // Logout functie
  function logoutUser() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "login.html";
  }
  
  // Maak de functies globaal beschikbaar
  window.loginWithGoogle = loginWithGoogle;
  window.loginWithMetaMask = loginWithMetaMask;
  window.logoutUser = logoutUser;
  