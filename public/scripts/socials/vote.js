// scripts/socials/vote.js

async function votePost(postId, type) {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("You must be logged in to vote.");
      return;
    }
    const user = await getUserInfo();
    if (!user) {
      alert("🚨 Unable to retrieve user info! Please log in again.");
      return;
    }
    try {
      const response = await fetch(`http://localhost:3000/posts/${postId}/vote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token.trim()}`
        },
        body: JSON.stringify({ userId: user.id, type })
      });
      if (!response.ok) {
        const data = await response.json();
        console.error("Error voting:", data.message);
        alert("Error: " + data.message);
      } else {
        const data = await response.json();
        console.log("Vote processed:", data);
        fetchPosts(); // Update posts to reflect new vote counts
      }
    } catch (error) {
      console.error("❌ Error voting:", error);
      alert("An error occurred while voting.");
    }
  }
  
  // Make the function globally available:
  window.votePost = votePost;
  