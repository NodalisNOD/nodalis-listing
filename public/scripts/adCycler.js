document.addEventListener('DOMContentLoaded', function() {
    fetch('/api/ads')
      .then(response => response.json())
      .then(files => {
        const adContainer = document.getElementById('ad-container');
        // Voor elk bestand in de map maken we een advertentie-item aan
        files.forEach((file, index) => {
          const adItem = document.createElement('div');
          adItem.classList.add('ad-item');
          if (index === 0) adItem.classList.add('active'); // toon de eerste ad standaard
  
          const a = document.createElement('a');
          // Pas de link aan op basis van de bestandsnaam (of gebruik een andere logica)
          if (file.toLowerCase().includes('crooks')) {
            a.href = "https://www.crooks.finance";
          } else if (file.toLowerCase().includes('cm')) {
            a.href = "https://cmacmint.netlify.app";
          } else {
            a.href = "#"; // default link indien nodig
          }
          a.target = "_blank";
          a.rel = "noopener noreferrer";
  
          const img = document.createElement('img');
          img.src = `/assets/ADS/FrontCycle/${file}`;
          img.alt = 'Advertisement';
  
          a.appendChild(img);
          adItem.appendChild(a);
          adContainer.appendChild(adItem);
        });
  
        // Advertenties laten cyclen als er meer dan 1 is
        const items = document.querySelectorAll('.ad-item');
        if (items.length > 1) {
          let index = 0;
          setInterval(() => {
            items[index].classList.remove('active');
            index = (index + 1) % items.length;
            items[index].classList.add('active');
          }, 5000); // wissel elke 5000 ms (5 seconden)
        }
      })
      .catch(error => {
        console.error('Error fetching ads:', error);
      });
  });
  