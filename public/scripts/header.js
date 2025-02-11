const header = document.getElementById("header");

header.innerHTML = `
  <div class="logo-container">
    <a href="index.html" class="logo-link">
      <img src="./assets/logo.png" alt="Crypto Logo" class="logo">
      <span class="site-title">Nodalis Listing</span>
    </a>
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
      </ul>
    </nav>
  </div>
`;
