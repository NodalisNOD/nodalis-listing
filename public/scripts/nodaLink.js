document.addEventListener("DOMContentLoaded", async () => {
  const linksContainer = document.getElementById("resultsContainer");
  const paginationContainer = document.getElementById("paginationContainer");
  const searchForm = document.getElementById("searchForm");
  const filterRoleEl = document.getElementById("filterRole");
  const filterAffiliationHidden = document.getElementById("filterAffiliation");
  const customAffiliationDropdown = document.getElementById("customAffiliationDropdown");
  const dropdownSelected = customAffiliationDropdown.querySelector(".custom-dropdown-selected");
  const dropdownOptionsContainer = customAffiliationDropdown.querySelector(".custom-dropdown-options");

  let linksData = [];
  let filteredData = [];
  let currentPage = 1;
  const itemsPerPage = 15; // 5 per row * 3 rows
  let affiliationMapping = {};

  // Laad affiliaties uit affiliations.json
  async function loadAffiliations() {
    try {
      const response = await fetch("/data/affiliations.json");
      if (!response.ok) {
        throw new Error("Failed to load affiliations.json");
      }
      affiliationMapping = await response.json();
      populateCustomAffiliationDropdown();
    } catch (error) {
      console.error("Error loading affiliations:", error);
    }
  }

  // Vul de custom dropdown met affiliaties en logo's
  function populateCustomAffiliationDropdown() {
    dropdownOptionsContainer.innerHTML = "";
    // Voeg een standaard optie toe
    const defaultOption = document.createElement("li");
    defaultOption.textContent = "Select Affiliation";
    defaultOption.setAttribute("data-value", "");
    dropdownOptionsContainer.appendChild(defaultOption);

    Object.keys(affiliationMapping).forEach(affiliation => {
      const li = document.createElement("li");
      li.setAttribute("data-value", affiliation);
      li.innerHTML = `<img src="${affiliationMapping[affiliation]}" alt="${affiliation} logo"> ${affiliation}`;
      dropdownOptionsContainer.appendChild(li);
    });
  }

  // Toggle custom dropdown open/close
  dropdownSelected.addEventListener("click", () => {
    customAffiliationDropdown.classList.toggle("active");
  });

  // Laat een optie selecteren
  dropdownOptionsContainer.addEventListener("click", (e) => {
    const target = e.target.closest("li");
    if (target) {
      const value = target.getAttribute("data-value");
      // Zet de geselecteerde optie (inclusief logo) in de geselecteerde div
      dropdownSelected.innerHTML = target.innerHTML;
      // Sla de waarde op in de verborgen input
      filterAffiliationHidden.value = value;
      customAffiliationDropdown.classList.remove("active");
    }
  });

  // Laad links uit links.json
  async function loadLinks() {
    try {
      const response = await fetch("/data/links.json");
      if (!response.ok) {
        throw new Error("Failed to load links.json");
      }
      linksData = await response.json();
      filteredData = linksData;
      displayLinks(filteredData, currentPage);
      populateRoleFilter(linksData);
      setupPagination(filteredData);
    } catch (error) {
      console.error("Error loading links:", error);
      linksContainer.textContent = "Error loading links data.";
    }
  }

  // Vul de rol filter dropdown met unieke rollen uit linksData
  function populateRoleFilter(data) {
    const uniqueRoles = new Set();
    data.forEach(link => {
      if (link.role) uniqueRoles.add(link.role);
    });
    filterRoleEl.innerHTML = `<option value="">Select Role</option>`;
    uniqueRoles.forEach(role => {
      const option = document.createElement("option");
      option.value = role;
      option.textContent = role;
      filterRoleEl.appendChild(option);
    });
  }

  // Toon de links als "squares" op de huidige pagina
  function displayLinks(data, page) {
    linksContainer.innerHTML = "";
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = page * itemsPerPage;
    const pageData = data.slice(startIndex, endIndex);

    if (pageData.length === 0) {
      linksContainer.textContent = "No links found.";
      return;
    }

    pageData.forEach(link => {
      const square = document.createElement("div");
      square.classList.add("link-square");
      square.innerHTML = `
        <img src="${link.profilePicture}" alt="${link.name}" class="profile-picture" />
        <h4>${link.name}</h4>
        <p>
          <span class="label">Role: ${link.role}</span>
          <span class="label">Affiliation: ${link.affiliation}</span>
        </p>
        ${link.twitter ? `<a href="${link.twitter}" class="btn-twitter" target="_blank">Link</a>` : ''}
      `;
      linksContainer.appendChild(square);
    });
  }

  // Filter de links op basis van zoekquery, rol en affiliatie
  searchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const query = document.getElementById("searchQuery").value.toLowerCase();
    const roleFilter = filterRoleEl.value.toLowerCase();
    const affiliationFilter = filterAffiliationHidden.value.toLowerCase();

    filteredData = linksData.filter(link => {
      const matchesName = link.name.toLowerCase().includes(query);
      const matchesRole = roleFilter ? link.role.toLowerCase() === roleFilter : true;
      const matchesAffiliation = affiliationFilter ? link.affiliation.toLowerCase() === affiliationFilter : true;
      return matchesName && matchesRole && matchesAffiliation;
    });

    currentPage = 1;
    displayLinks(filteredData, currentPage);
    setupPagination(filteredData);
  });

  // Paginatie
  function setupPagination(data) {
    paginationContainer.innerHTML = "";
    const totalPages = Math.ceil(data.length / itemsPerPage);
    if (totalPages <= 1) return;

    for (let i = 1; i <= totalPages; i++) {
      const btn = document.createElement("button");
      btn.textContent = i;
      if (i === currentPage) {
        btn.classList.add("active");
      }
      btn.addEventListener("click", () => {
        currentPage = i;
        displayLinks(data, currentPage);
        Array.from(paginationContainer.children).forEach(child => child.classList.remove("active"));
        btn.classList.add("active");
      });
      paginationContainer.appendChild(btn);
    }
  }

  // Eerst de affiliaties laden, dan de links
  await loadAffiliations();
  loadLinks();
});
