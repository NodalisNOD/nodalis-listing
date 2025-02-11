// scripts/socials/comment.js

async function addCommentUI(postId) {
    const input = document.getElementById(`commentInput-${postId}`);
    const comment = input.value.trim();
    
    if (!comment) {
      displayMessage("Please enter a comment.");
      return;
    }
    
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:3000/posts/${postId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token.trim()}`
        },
        body: JSON.stringify({ comment })
      });
      
      if (!response.ok) {
        const data = await response.json();
        console.error("Error adding comment:", data.message);
        displayMessage("Error: " + data.message);
      } else {
        const data = await response.json();
        console.log("Comment added successfully:", data);
        input.value = "";
        // Update the comments display
        loadComments(postId);
        // Update the comment count in the toggle button
        if (data.post && Array.isArray(data.post.comments)) {
          const count = data.post.comments.length;
          const toggleButton = document.getElementById(`toggleComments-${postId}`);
          if (toggleButton) {
            toggleButton.innerHTML = `💬 Show comments (${count})`;
          }
        }
        displayMessage("Comment added successfully!", "success");
      }
    } catch (error) {
      console.error("❌ Error adding comment:", error);
      displayMessage("An error occurred while adding the comment.");
    }
  }
    
  window.addCommentUI = addCommentUI;
  