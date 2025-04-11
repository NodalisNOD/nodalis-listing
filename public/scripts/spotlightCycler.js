document.addEventListener('DOMContentLoaded', function() {
  const spotlightContainer = document.getElementById('spotlight-container');
  if (!spotlightContainer) {
    console.error("Spotlight container not found");
    return;
  }

  fetch('/api/ads')
    .then(response => response.json())
    .then(files => {
      console.log("Bestanden ontvangen:", files);
      files.forEach((file, index) => {
        console.log(`Verwerk bestand ${index}: ${file}`);
        const item = document.createElement('div');
        item.classList.add('spotlight-item');
        if (index === 0) item.classList.add('active'); // toon de eerste spotlight standaard

        const a = document.createElement('a');
        if (file.toLowerCase().includes('kitty')) {
          a.href = "https://www.kitcoin.io";
        } else if (file.toLowerCase().includes('david')) {
          a.href = "https://x.com/lildavid_cro?s=21";
        } else if (file.toLowerCase().includes('kwl')) {
          // "nodalink" vervangen door "kwl" met de nieuwe link:
          a.href = "https://x.com/KrisWifLion?t=ZQEtt9_IX6fdA_zn-KCoWQ&s=09";
        } else {
          a.href = "#"; // fallback link
        }
        a.target = "_blank";
        a.rel = "noopener noreferrer";

        const img = document.createElement('img');
        img.src = `/assets/promoImages/FrontCycle/${file}`;
        img.alt = 'Spotlight';

        a.appendChild(img);
        item.appendChild(a);
        spotlightContainer.appendChild(item);
      });

      const items = document.querySelectorAll('.spotlight-item');
      if (items.length > 1) {
        let index = 0;
        setInterval(() => {
          items[index].classList.remove('active');
          index = (index + 1) % items.length;
          items[index].classList.add('active');
        }, 5000);
      }
    })
    .catch(error => {
      console.error("Error fetching ads:", error);
    });
});
