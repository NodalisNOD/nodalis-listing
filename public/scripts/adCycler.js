document.addEventListener('DOMContentLoaded', function() {
    fetch('/api/ads')
      .then(response => response.json())
      .then(files => {
        console.log("Bestanden ontvangen:", files);
        const adContainer = document.getElementById('ad-container');
        files.forEach((file, index) => {
          console.log(`Verwerk bestand ${index}: ${file}`);
          const adItem = document.createElement('div');
          adItem.classList.add('ad-item');
          if (index === 0) adItem.classList.add('active'); // toon de eerste ad standaard
  
          const a = document.createElement('a');
          if (file.toLowerCase().includes('crooks')) {
            a.href = "https://www.crooks.finance";
          } else if (file.toLowerCase().includes('cm')) {
            a.href = "https://cmacmint.netlify.app";
          } else {
            a.href = "#";
          }
          a.target = "_blank";
          a.rel = "noopener noreferrer";
  
          const img = document.createElement('img');
          img.src = `/assets/promoImages/FrontCycle/${file}`;
          img.alt = 'picture';
          console.log("Afbeeldingssrc ingesteld op:", img.src);
  
          a.appendChild(img);
          adItem.appendChild(a);
          adContainer.appendChild(adItem);
        });
  
        const items = document.querySelectorAll('.ad-item');
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
        console.error('Error fetching ads:', error);
      });
  });
  