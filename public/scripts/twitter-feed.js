const tokenId = "cronos"; // Unique ID for Cronos Chain sentiment votes

async function fetchVotes() {
  try {
    const response = await fetch(`/votes/global`);
    if (!response.ok) throw new Error("Failed to fetch votes");

    const votes = await response.json();
    updateSentimentBar(votes);
  } catch (error) {
    console.error("❌ Error fetching votes:", error);
  }
}

async function submitVote(type) {
  try {
    const response = await fetch(`/votes/global/${type}`, { method: "POST" });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Vote failed");
    }

    updateSentimentBar(data.votes);
    displayMessage("✅ Your vote has been recorded.");
  } catch (error) {
    console.error("❌ Error submitting vote:", error);

    if (error.message.includes("You already voted today")) {
      displayMessage("🚫 You already voted today. Try again tomorrow.");
    } else {
      displayMessage("❌ Failed to submit vote.");
    }
  }
}

function updateSentimentBar(votes) {
  const totalVotes = votes.positive + votes.negative;
  let positivePercentage = 0;
  let negativePercentage = 0;

  if (totalVotes > 0) {
    positivePercentage = ((votes.positive / totalVotes) * 100).toFixed(1);
    negativePercentage = ((votes.negative / totalVotes) * 100).toFixed(1);
  }

  document.getElementById("positive-bar").style.width = `${positivePercentage}%`;
  document.getElementById("positive-bar").textContent = totalVotes > 0 ? `${positivePercentage}% ` : "";
  document.getElementById("negative-bar").style.width = `${negativePercentage}%`;
  document.getElementById("negative-bar").textContent = totalVotes > 0 ? `${negativePercentage}% ` : "";
}

function displayMessage(message) {
  const messageBox = document.getElementById("vote-message");
  messageBox.textContent = message;
  messageBox.style.display = "block";
  setTimeout(() => {
    messageBox.style.display = "none";
  }, 5000);
}

function displaySentiment() {
  const sentimentHtml = `
    <div class="sentiment-container">
      <div class="tooltip-wrapper">
        <h3>Cronos Community Sentiment</h3>
        <img src="./assets/about.png" alt="About Sentiment" class="tooltip-icon" />
        <span class="tooltip-text">The community's opinion on Cronos Chain.</span>
      </div>
      <div class="sentiment-bar">
        <div id="positive-bar" class="positive-bar"></div>
        <div id="negative-bar" class="negative-bar"></div>
      </div>
      <div id="vote-message" class="vote-message" style="display: none;"></div>
      <div class="vote-buttons">
        <img id="vote-positive" src="./assets/like.png" alt="Like" class="vote-icon" />
        <img id="vote-negative" src="./assets/dislike.png" alt="Dislike" class="vote-icon" />
      </div>
    </div>
  `;

  document.getElementById("twitter-feed").innerHTML = sentimentHtml;

  document.getElementById("vote-positive").addEventListener("click", () => submitVote("positive"));
  document.getElementById("vote-negative").addEventListener("click", () => submitVote("negative"));
}

document.addEventListener("DOMContentLoaded", () => {
  displaySentiment();
  fetchVotes();
});
