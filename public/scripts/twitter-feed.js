const TWEET_CACHE_DURATION = 10 * 60 * 1000; // 10 minuten in milliseconden

async function fetchLatestTweet() {
  const cacheKey = "latestTweet";
  const cacheTimeKey = "latestTweetTime";
  const now = Date.now();

  // Probeer de tweetgegevens uit de cache te halen
  const cachedData = localStorage.getItem(cacheKey);
  const cachedTime = localStorage.getItem(cacheTimeKey);

  if (cachedData && cachedTime && now - parseInt(cachedTime, 10) < TWEET_CACHE_DURATION) {
    console.log("✅ Tweet laden vanuit browsercache");
    displayTweet(JSON.parse(cachedData));
    return;
  }

  // Als er geen geldige cache is, haal de data op via het API-endpoint
  try {
    const response = await fetch("/api/latest-tweet");
    if (!response.ok) throw new Error("Failed to fetch tweet");

    const data = await response.json();

    // Sla de opgehaalde data op in de browsercache
    localStorage.setItem(cacheKey, JSON.stringify(data));
    localStorage.setItem(cacheTimeKey, now.toString());

    displayTweet(data);
  } catch (error) {
    console.error("Error loading tweet:", error);
  }
}

// Functie om de tweet in de DOM te tonen
function displayTweet(data) {
  const twitterFeed = document.getElementById("twitter-feed");
  const tweetUrl = `https://twitter.com/${data.username}/status/${data.tweet_id}`;

  twitterFeed.innerHTML = `
    <div class="twitter-feed-container">
      <div class="tweet-header">
        <img src="${data.profile_image_url}" alt="${data.username}" class="tweet-profile-pic">
        <div class="tweet-info">
          <span class="tweet-author"><a href="https://twitter.com/${data.username}" target="_blank">@${data.username}</a></span>
          <span class="tweet-date">${new Date(data.created_at).toLocaleString()}</span>
        </div>
      </div>
      <div class="tweet-box">
        <p class="tweet-text">${data.tweet}</p>
        ${data.image_url ? `<img src="${data.image_url}" alt="Tweet Image" class="tweet-image">` : ""}
      </div>
      <a href="${tweetUrl}" target="_blank" class="tweet-button">View on X</a>
    </div>
  `;
}

document.addEventListener("DOMContentLoaded", () => {
  fetchLatestTweet();
  // Vernieuw de tweet elke 15 minuten (900000 ms)
  setInterval(fetchLatestTweet, 900000);
});
