const header = document.getElementById("header");

header.innerHTML = `
  <div class="logo-container">
    <a href="/index.html" class="logo-link">
      <img src="/assets/logo.png" alt="Crypto Logo" class="logo">
      <span class="site-title">Nodalis Network</span>
    </a>
    <!-- Hamburger-menu voor mobiel -->
    <button class="menu-toggle" aria-label="Menu">&#9776;</button>
    <nav>
      <ul class="nav-list">
        <li><a href="/index.html">Tokens</a></li>
        <li><a href="/dexs.html">Exchanges</a></li>
        <!-- Dropdown "Products" menu (blijft onveranderd) -->
        <li class="dropdown">
          <a href="#" class="dropdown-toggle">Products</a>
          <ul class="dropdown-menu">
            <li>
              <a href="/calculator.html">
                <img src="/assets/exchange.png" alt="Currency Converter" class="dropdown-icon">
                Currency Converter
              </a>
            </li>
            <li>
              <a href="/advertise.html">
                <img src="/assets/megaphone.png" alt="Advertise" class="dropdown-icon">
                Advertise
              </a>
            </li>
            <li>
              <a href="/listForm.html">
                <img src="/assets/check.png" alt="Get listed" class="dropdown-icon">
                Get listed
              </a>
            </li>
            <li>
              <a href="/NodaLink">
                <img src="/assets/UI/linked.png" alt="Noda Link" class="dropdown-icon">
                Noda Link
              </a>
            </li>
          </ul>
        </li>
        <!-- Nieuwe dropdown "Nodalis" menu -->
        <li class="dropdown">
          <a href="#" class="dropdown-toggle">Nodalis</a>
          <ul class="dropdown-menu">
            <li>
              <a href="/roadmap.html">
                <img src="/assets/UI/roadmap.png" alt="Roadmap" class="dropdown-icon">
                Roadmap
              </a>
            </li>
            <li>
              <a href="/tokenomics.html">
                <img src="/assets/UI/tokenomics.png" alt="Tokenomics" class="dropdown-icon">
                Tokenomics
              </a>
            </li>
          </ul>
        </li>
        <!-- Dropdown "Crypto.com" menu (nu als laatst in de lijst) -->
        <li class="dropdown">
          <a href="#" class="dropdown-toggle">Crypto.com</a>
          <ul class="dropdown-menu">
            <li>
              <a href="https://crypto.com/eea" target="_blank">
                <img src="/assets/crypto.png" alt="Crypto.com" class="dropdown-icon">
                Crypto.com
              </a>
            </li>
            <li>
              <a href="https://crypto.com/exchange/" target="_blank">
                <img src="/assets/crypto.png" alt="Crypto.com Exchange" class="dropdown-icon">
                Crypto.com Exchange
              </a>
            </li>
          </ul>
        </li>
        <!-- "Get listed" knop -->
        <li class="get-listed">
          <a href="/listing" class="get-listed-button">Get listed</a>
        </li>
        <!-- Login/Register knop -->
        <li class="login-btn auth-container" id="auth-btn-container">
          <button id="google-signin" class="auth-btn">Login / Register</button>
        </li>
      </ul>
    </nav>
  </div>
`;

// Toggle de navigatie op mobiel
const menuToggle = document.querySelector(".menu-toggle");
const nav = document.querySelector("header nav");

menuToggle.addEventListener("click", () => {
  nav.classList.toggle("active");
});

// Firebase Google Sign-In functionaliteit
function signInWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  firebase.auth().signInWithPopup(provider)
    .then((result) => {
      console.log("✅ User logged in:", result.user);
      // Eventueel: stuur gebruikersdata naar je server voor verdere verwerking
    })
    .catch((error) => {
      console.error("❌ Error during login:", error);
    });
}

const authBtnContainer = document.getElementById("auth-btn-container");

// Stel de click event listener in voor de login-knop
document.getElementById("google-signin").addEventListener("click", signInWithGoogle);

// Update de header op basis van de authenticatiestatus
firebase.auth().onAuthStateChanged((user) => {
  if (user) {
    authBtnContainer.innerHTML = `
      <span>Welcome, ${user.displayName}</span>
      <button id="signout-btn" class="auth-btn">Logout</button>
    `;
    document.getElementById("signout-btn").addEventListener("click", () => {
      firebase.auth().signOut()
        .then(() => {
          console.log("✅ User logged out");
        })
        .catch((error) => {
          console.error("❌ Error during logout:", error);
        });
    });
  } else {
    authBtnContainer.innerHTML = `
      <button id="google-signin" class="auth-btn">Login / Register</button>
    `;
    document.getElementById("google-signin").addEventListener("click", signInWithGoogle);
  }
});
