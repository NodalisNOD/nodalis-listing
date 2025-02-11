// Functie om gegevens op te halen en weer te geven
async function fetchAndDisplayDexDetails() {
  const dexData = [
    {
      name: "VVS Finance",
      api: "https://api.llama.fi/summary/dexs/vvs-finance?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true&dataType=dailyVolume",
      tableId: "dex-table",
    },   
    {
      name: "Wolfswap",
      api: "https://api.llama.fi/summary/aggregators/wolfswap?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true&dataType=dailyVolume",
      tableId: "aggregator-table",
    },
  ];

  const formatNumber = (number) => {
    if (number === undefined || number === null) return "N/A";
    return `$${number.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  for (const dex of dexData) {
    try {
      const response = await fetch(dex.api);
      const data = await response.json();

      // Controleer of de noodzakelijke velden aanwezig zijn
      const requiredFields = ["name", "url", "logo", "total24h"];
      const missingFields = requiredFields.filter((field) => !(field in data));

      if (missingFields.length > 0) {
        console.error(`Invalid data for ${dex.name}: Missing fields: ${missingFields.join(", ")}`);
        continue;
      }

      const details = {
        name: data.name || "Unknown",
        url: data.url || "#",
        logo: data.logo || "./assets/default-logo.png",
        total24h: data.total24h || 0,
        total48hto24h: data.total48hto24h || 0,
        total7d: data.total7d || 0,
        totalAllTime: data.totalAllTime || 0,
        change1d: data.change_1d || 0,
      };

      const table = document.getElementById(dex.tableId);

      const changeClass = details.change1d >= 0 ? "change-positive" : "change-negative";

      const row = document.createElement("tr");
      row.innerHTML = `
        <td>
          <a href="${details.url}" target="_blank" class="no-underline">
            <img src="${details.logo}" alt="${details.name} Logo" class="dex-logo">
            ${details.name}
          </a>
        </td>
        <td>${formatNumber(details.total24h)}</td>
        <td>${formatNumber(details.total48hto24h)}</td>
        <td>${formatNumber(details.total7d)}</td>
        <td>${formatNumber(details.totalAllTime)}</td>
        <td class="${changeClass}">${details.change1d > 0 ? "+" : ""}${details.change1d}%</td>
      `;
      table.appendChild(row);
    } catch (error) {
      console.error(`Error fetching data for ${dex.name}:`, error);
    }
  }
}

// Roep de functie aan bij pagina-lading
document.addEventListener("DOMContentLoaded", fetchAndDisplayDexDetails);
