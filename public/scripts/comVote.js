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

  // Variabele om te voorkomen dat flushVotes meerdere keren wordt aangeroepen
  let flushCalled = false;

  // Update de reset‑afteller en controleer of deze 0 is
  function updateResetTimer() {
    const timerEl = document.getElementById('reset-timer');
    const remaining = getTimeRemaining();
    timerEl.textContent = `Reset in: ${formatTime(remaining)}`;

    // Als de timer 0 is en flush nog niet is uitgevoerd, flush de stemmen
    if (remaining === 0 && !flushCalled) {
      flushVotes();
      flushCalled = true;
    } else if (remaining > 0) {
      flushCalled = false; // reset de flag zodra de timer weer op een positieve waarde staat
    }
  }

  // Haal stemmen op en update de sentimentbalk en totaal aantal stemmen
  function updateVotes() {
    fetch('/api/comvote/votes')
      .then(response => response.json())
      .then(data => {
        // Verwachte data: { positive, negative, total }.
        const positive = data.positive || 0;
        const negative = data.negative || 0;
        const total = typeof data.total === 'number' ? data.total : (positive + negative);
        let positivePercent = 0;
        let negativePercent = 0;
        if (total > 0) {
          positivePercent = (positive / total) * 100;
          negativePercent = (negative / total) * 100;
        }
        
        // Update de sentimentbalken binnen de container #comVotes
        document.querySelectorAll('#comVotes .positive-bar').forEach(bar => {
          bar.style.width = positivePercent + '%';
          bar.textContent = total > 0 ? positivePercent.toFixed(0) + '%' : '';
        });
        document.querySelectorAll('#comVotes .negative-bar').forEach(bar => {
          bar.style.width = negativePercent + '%';
          bar.textContent = total > 0 ? negativePercent.toFixed(0) + '%' : '';
        });

        // Update totaal aantal stemmen (element met id "total-votes")
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
    return (
      lastVote.getUTCFullYear() !== now.getUTCFullYear() ||
      lastVote.getUTCMonth() !== now.getUTCMonth() ||
      lastVote.getUTCDate() !== now.getUTCDate()
    );
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

  // Functie om de stemmen in de database te flushen (resetten)
  function flushVotes() {
    fetch('/api/comvote/flush', { method: 'POST' })
      .then(response => response.json())
      .then(result => {
        if (result.success) {
          console.log('Votes flushed successfully.');
          updateVotes();
          // Verwijder lokale stemtijd zodat opnieuw gestemd kan worden
          localStorage.removeItem('lastVoteTime');
          updateVoteButtons();
        } else {
          console.error('Failed to flush votes:', result.error);
        }
      })
      .catch(error => console.error('Error flushing votes:', error));
  }

  // Stel de stemknoppen in met de juiste iconen
  const positiveBtn = document.getElementById('vote-positive');
  positiveBtn.innerHTML = '<img src="./assets/UI/like.png" alt="Positive Vote">';
  const negativeBtn = document.getElementById('vote-negative');
  negativeBtn.innerHTML = '<img src="./assets/UI/dislike.png" alt="Negative Vote">';

  // Event listeners voor stemknoppen
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

  // Initial updates
  updateVotes();
  updateVoteButtons();
  updateResetTimer();

  // Update de reset timer elke seconde
  setInterval(updateResetTimer, 1000);
});
