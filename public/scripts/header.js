const header = document.getElementById("header");

header.innerHTML = `
  <div class="logo-container">
    <a href="index.html" class="logo-link">
      <img src="./assets/logo.png" alt="Crypto Logo" class="logo">
      <span class="site-title">Nodalis Listing</span>
    </a>
    <!-- Hamburger-menu voor mobiel -->
    <button class="menu-toggle" aria-label="Menu">&#9776;</button>
    <nav>
      <ul class="nav-list">
        <li><a href="index.html">Tokens</a></li>
        <li><a href="dexs.html">Exchanges</a></li>
        <!-- Uitklapbaar "Products" menu -->
        <li class="dropdown">
          <a href="#" class="dropdown-toggle">Products</a>
          <ul class="dropdown-menu">
            <li>
              <a href="calculator.html">
                <img src="./assets/exchange.png" alt="Currency Converter" class="dropdown-icon">
                Currency Converter
              </a>
            </li>
            <li>
              <a href="advertise.html">
                <img src="./assets/megaphone.png" alt="Advertise" class="dropdown-icon">
                Advertise
              </a>
            </li>
            <li>
              <a href="listForm.html">
                <img src="./assets/check.png" alt="Get listed" class="dropdown-icon">
                Get listed
              </a>
            </li>
          </ul>
        </li>
        <!-- Extra uitklapbaar "Crypto.com" menu -->
        <li class="dropdown">
          <a href="#" class="dropdown-toggle">Crypto.com</a>
          <ul class="dropdown-menu">
            <li>
              <a href="https://crypto.com/eea" target="_blank">
                <img src="./assets/crypto.png" alt="Crypto.com" class="dropdown-icon">
                Crypto.com
              </a>
            </li>
            <li>
              <a href="https://crypto.com/exchange/" target="_blank">
                <img src="./assets/crypto.png" alt="Crypto.com Exchange" class="dropdown-icon">
                Crypto.com Exchange
              </a>
            </li>
          </ul>
        </li>
        <!-- "Get listed" knop als nav-item -->
        <li class="get-listed">
          <a href="/listing" class="get-listed-button">Get listed</a>
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
