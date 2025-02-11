async function fetchLatestTweet() {
    try {
      const response = await fetch("http://localhost:3000/api/latest-tweet");
      if (!response.ok) throw new Error("Failed to fetch tweet");
  
      const data = await response.json();
      const twitterFeed = document.getElementById("twitter-feed");
  
      // Genereer een klikbare knop naar de tweet
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
    } catch (error) {
      console.error("Error loading tweet:", error);
    }
  }
  
  // Laad een nieuwe tweet elke 5 minuten
  document.addEventListener("DOMContentLoaded", () => {
    fetchLatestTweet();
    setInterval(fetchLatestTweet, 900000);
  });
  