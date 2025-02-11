// scripts/socials/post.js

document.addEventListener("DOMContentLoaded", async function () {
  await fetchPosts();
});

async function fetchPosts() {
  const user = await getUserInfo();
  if (!user) {
    document.getElementById("posts").innerHTML = "<p>You must be logged in to view posts.</p>";
    return;
  }
  const response = await fetch("http://localhost:3000/posts");
  const posts = await response.json();
  posts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  const postsContainer = document.getElementById("posts");
  postsContainer.innerHTML = posts.map(post => `
    <div class="post-card">
      <div class="post-header">
        <strong>
  <a href="profile.html?userId=${post.author ? post.author.id : ''}">
    ${post.author?.username || "Unknown user"}
  </a>
</strong>

        <small>${formatDate(post.timestamp)}</small>
      </div>
      <p class="post-content">${formatHashtags(post.content)}</p>
      <div class="vote-buttons">
        <button onclick="votePost('${post.id}', 'upvote')">👍 (${post.upvotes})</button>
        <button onclick="votePost('${post.id}', 'downvote')">👎 (${post.downvotes})</button>
      </div>
      <button id="toggleComments-${post.id}" class="toggle-comments" onclick="toggleComments('${post.id}')">
        💬 Show comments (${post.comments ? post.comments.length : 0})
      </button>
      <div id="comments-${post.id}" class="comments-container" style="display: none;"></div>
      <div class="comment-input">
        <input type="text" id="commentInput-${post.id}" placeholder="write a reaction...">
        <button onclick="addCommentUI('${post.id}')">React</button>
      </div>
    </div>
  `).join("");
}

function toggleComments(postId) {
  const commentsContainer = document.getElementById(`comments-${postId}`);
  if (commentsContainer.style.display === "none") {
    commentsContainer.style.display = "block";
    loadComments(postId);
  } else {
    commentsContainer.style.display = "none";
  }
}

async function loadComments(postId) {
  try {
    const response = await fetch(`http://localhost:3000/posts/${postId}`);
    const post = await response.json();
    const commentsContainer = document.getElementById(`comments-${postId}`);
    const validComments = (post.comments || []).filter(comment => comment !== null);
    commentsContainer.innerHTML = validComments.map(comment => `
      <div class="comment">
        <strong>${comment.author}</strong>: ${comment.content}
      </div>
    `).join("");
  } catch (error) {
    console.error("❌ Error loading comments:", error);
  }
}

function formatHashtags(content) {
  return content.replace(/#(\w+)/g, '<span class="hashtag">#$1</span>');
}

function formatDate(timestamp) {
  return new Date(timestamp).toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function fetchTrendingPosts() {
  try {
    const response = await fetch("http://localhost:3000/posts/trending");
    const posts = await response.json();
    const container = document.getElementById("trendingPosts");
    container.innerHTML = posts.map(post => `
      <div class="post-card">
        <div class="post-header">
          <strong>${post.author?.username || "Unknown user"}</strong>
          <small>${formatDate(post.timestamp)}</small>
        </div>
        <p class="post-content">${formatHashtags(post.content)}</p>
        <p>👍 ${post.upvotes} votes</p>
      </div>
    `).join("");
  } catch (error) {
    console.error("Error fetching trending posts:", error);
  }
}

async function fetchTrendingHashtags() {
  try {
    const response = await fetch("http://localhost:3000/hashtags/trending");
    const hashtags = await response.json();
    const container = document.getElementById("trendingHashtags");
    container.innerHTML = hashtags.map(item => `
      <div class="hashtag-item">
        <span>${item.tag}</span> (${item.count})
      </div>
    `).join("");
  } catch (error) {
    console.error("Error fetching trending hashtags:", error);
  }
}

async function createPost() {
  const content = document.getElementById("postContent").value;
  const token = localStorage.getItem("token");
  
  if (!token) {
    displayMessage("You must be logged in to create a post.");
    return;
  }
  
  const user = await getUserInfo();
  if (!user) {
    displayMessage("🚨 Unable to retrieve user information! Please log in again.");
    return;
  }
  
  const maxLength = user.verified ? 750 : 250;
  if (content.length > maxLength) {
    displayMessage(`Maximum ${maxLength} characters allowed!`);
    return;
  }
  
  const response = await fetch("http://localhost:3000/posts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token.trim()}`
    },
    body: JSON.stringify({ content })
  });
  
  const data = await response.json();
  // Clear the input field and refresh posts.
  document.getElementById("postContent").value = "";
  fetchPosts();
  displayMessage("Post created successfully!", "success");
}

window.createPost = createPost;

// Make functions globally available:
window.fetchPosts = fetchPosts;
window.createPost = createPost;
window.toggleComments = toggleComments;
window.loadComments = loadComments;
window.formatHashtags = formatHashtags;
window.formatDate = formatDate;
