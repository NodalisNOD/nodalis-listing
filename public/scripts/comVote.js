document.addEventListener('DOMContentLoaded', () => {
  // Bereken het aantal milliseconden tot de volgende UTC-middernacht
  function getTimeRemaining() {
    const now = new Date();
    const nextMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
    const diff = nextMidnight - now;
    return diff > 0 ? diff : 0;
  }

  // Formatteer milliseconden naar HH:MM:SS
  function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }

  // Update de reset‑afteller
  function updateResetTimer() {
    const timerEl = document.getElementById('reset-timer');
    const remaining = getTimeRemaining();
    timerEl.textContent = `Reset in: ${formatTime(remaining)}`;
  }

  // Haal stemmen op en update de sentimentbalk en totaal aantal stemmen
  function updateVotes() {
    fetch('/api/comvote/votes')
      .then(response => response.json())
      .then(data => {
        // Verwachte data: { positive, negative, total }.
        const positive = data.positive || 0;
        const negative = data.negative || 0;
        // Gebruik data.total als een getal, anders bereken het als som van positieve en negatieve stemmen
        const total = typeof data.total === 'number' ? data.total : (positive + negative);
        let positivePercent = 0;
        let negativePercent = 0;
        if (total > 0) {
          positivePercent = (positive / total) * 100;
          negativePercent = (negative / total) * 100;
        }
        
        // Update de sentimentbalken binnen de container #comVotes (zorg dat je HTML zo is opgebouwd)
        document.querySelectorAll('#comVotes .positive-bar').forEach(bar => {
          bar.style.width = positivePercent + '%';
          // Als er stemmen zijn, toon het percentage; anders geen tekst
          bar.textContent = total > 0 ? positivePercent.toFixed(0) + '%' : '';
        });
        document.querySelectorAll('#comVotes .negative-bar').forEach(bar => {
          bar.style.width = negativePercent + '%';
          bar.textContent = total > 0 ? negativePercent.toFixed(0) + '%' : '';
        });

        // Update totaal aantal stemmen (zorg dat er een element met id="total-votes" bestaat)
        const totalVotesEl = document.getElementById('total-votes');
        if (totalVotesEl) {
          totalVotesEl.textContent = `Votes: ${total}`;
        }
      })
      .catch(error => console.error('Error fetching votes:', error));
  }

  // Controleer of er vandaag (UTC) al gestemd is
  function canVote() {
    const lastVoteTime = localStorage.getItem('lastVoteTime');
    if (!lastVoteTime) return true;
    const lastVote = new Date(lastVoteTime);
    const now = new Date();
    return lastVote.getUTCFullYear() !== now.getUTCFullYear() ||
           lastVote.getUTCMonth() !== now.getUTCMonth() ||
           lastVote.getUTCDate() !== now.getUTCDate();
  }

  // Update de enabled/disabled status van de stemknoppen
  function updateVoteButtons() {
    const positiveBtn = document.getElementById('vote-positive');
    const negativeBtn = document.getElementById('vote-negative');
    if (canVote()) {
      positiveBtn.disabled = false;
      negativeBtn.disabled = false;
    } else {
      positiveBtn.disabled = true;
      negativeBtn.disabled = true;
    }
  }

  // Verstuur een stem naar de server
  function sendVote(voteType) {
    fetch('/api/comvote/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voteType })
    })
      .then(response => response.json())
      .then(result => {
        if (result.success) {
          updateVotes();
          // Sla de stemtijd op zodat pas morgen gestemd kan worden
          localStorage.setItem('lastVoteTime', new Date().toISOString());
          updateVoteButtons();
        } else {
          console.error('Vote error:', result.error);
        }
      })
      .catch(error => console.error('Error sending vote:', error));
  }


  const positiveBtn = document.getElementById('vote-positive');
  positiveBtn.innerHTML = '<img src="./assets/UI/like.png" alt="Positive Vote">';
  const negativeBtn = document.getElementById('vote-negative');
  negativeBtn.innerHTML = '<img src="./assets/UI/dislike.png" alt="Negative Vote">';


  positiveBtn.addEventListener('click', () => {
    if (canVote()) {
      sendVote('positive');
      updateVoteButtons();
    } else {
      alert('You already voted today.');
    }
  });

  negativeBtn.addEventListener('click', () => {
    if (canVote()) {
      sendVote('negative');
      updateVoteButtons();
    } else {
      alert('You already voted today.');
    }
  });

  
  updateVotes();
  updateVoteButtons();
  updateResetTimer();

  setInterval(updateResetTimer, 1000);
});
