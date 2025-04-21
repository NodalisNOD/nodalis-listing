const footer = document.getElementById('footer');

footer.innerHTML = `
  <div class="footer-container">
    <!-- Deel 1: Tekst met logo -->
    <div class="footer-section">
      <div class="footer-logo-text">
        <img src="/assets/logo.png" alt="Nodalis Logo" class="footer-logo" />
        <p>
          Nodalis provides in-depth insights into the Cronos ecosystem and strives to empower users with actionable data.
        </p>
      </div>
    </div>
<!-- Deel 2: Support -->
<div class="footer-section">
  <h3>Support</h3>
  <ul>
    <li>
      <a href="/contact.html" target="_blank" rel="noopener noreferrer">
        <img src="./assets/UI/adwords.png" alt="Advertise Icon" style="width:16px; height:16px; vertical-align:middle; margin-right:6px;" />
        Advertise with us
      </a>
    </li>
    <li>
      <a href="/listForm.html" target="_blank" rel="noopener noreferrer">
        <img src="./assets/UI/exam.png" alt="List Form Icon" style="width:16px; height:16px; vertical-align:middle; margin-right:6px;" />
        Get listed
      </a>
    </li>
    <li>
      <a href="/contact.html" target="_blank" rel="noopener noreferrer">
        <img src="./assets/UI/contact-us.png" alt="Contact Icon" style="width:16px; height:16px; vertical-align:middle; margin-right:6px;" />
        Contact
      </a>
    </li>
    <li>
      <a href="/faq.html" target="_blank" rel="noopener noreferrer">
        <img src="./assets/UI/help.png" alt="FAQ Icon" style="width:16px; height:16px; vertical-align:middle; margin-right:6px;" />
        FAQ
      </a>
    </li>
    <li>
      <a href="/whatIsNodalis.html" target="_blank" rel="noopener noreferrer">
        <img src="./assets/UI/document.png" alt="Documentation Icon" style="width:16px; height:16px; vertical-align:middle; margin-right:6px;" />
        Documentation
      </a>
    </li>
  </ul>
</div>


<!-- Deel 3: Socials -->
<div class="footer-section">
  <h3>Socials</h3>
  <ul>
    <li>
      <a href="https://x.com/Nodalis_Network" target="_blank">
        <img src="./assets/UI/twitter.png" alt="Twitter" style="width:16px; height:16px; vertical-align:middle; margin-right:6px;">
        X (Twitter)
      </a>
    </li>
    <li>
      <a href="https://discord.gg/JGkvJYC85E" target="_blank">
        <img src="./assets/UI/discord.png" alt="Discord" style="width:16px; height:16px; vertical-align:middle; margin-right:6px;">
        Discord
      </a>
    </li>
    <li>
      <a href="https://www.reddit.com/r/Nodalis/" target="_blank">
        <img src="./assets/UI/reddit.png" alt="Reddit" style="width:16px; height:16px; vertical-align:middle; margin-right:6px;">
        Reddit
      </a>
    </li>
    <li>
      <a href="https://www.linkedin.com/company/nodalisting/posts/?feedView=all" target="_blank">
        <img src="./assets/UI/linkedin.png" alt="LinkedIn" style="width:16px; height:16px; vertical-align:middle; margin-right:6px;">
        LinkedIn
      </a>
    </li>
  </ul>
</div>


    <!-- Deel 4: About -->
    <div class="footer-section">
      <h3>Donations</h3>
      <ul>
        <li><a href="/donate.html">Cronos</a></li>
      </ul>
      <div>
        <h3>Legal</h3>
        <ul>
          <li><a href="/tos.html">Terms of Service</a></li>
          <li><a href="/pos.html">Privacy Policy</a></li>
          <li><img src="/assets/ssl.png" alt="SSL" /></li>
        </ul>
      </div>
    </div>

    <!-- Deel 5: Business -->
    <div class="footer-section">
      <h3>Business</h3>
      <ul>
        <li><a href="/advertise.html" target="_blank" rel="noopener noreferrer">Advertise with us</a></li>
      </ul>
    </div>
  </div>

  <div class="footer-disclaimer">
    <p>
      <strong>IMPORTANT DISCLAIMER:</strong> All content provided herein, on our website, linked websites, associated applications, forums, blogs, social media accounts, and other platforms ("Site"), is for general informational purposes only and sourced from external parties. We make no representations or warranties of any kind regarding our content, including but not limited to accuracy, completeness, or timeliness. None of the content we provide constitutes financial, legal, or other professional advice intended for your specific reliance for any purpose. Any use of or reliance on our content is entirely at your own risk and discretion. You are strongly advised to conduct your own research, review, analyze, and verify our content before relying on it. Trading and investing in cryptocurrencies involve significant risk and can result in substantial losses. Consult with your financial advisor before making any decision. None of the content on our Site constitutes a solicitation or offer to engage in any transaction.
    </p>
  </div>

  <p class="footer-bottom">&copy; 2025 Nodalis Platform. All rights reserved.</p>
`;
