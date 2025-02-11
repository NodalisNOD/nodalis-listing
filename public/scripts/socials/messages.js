function displayMessage(message, type = "error") {
    const messageBox = document.getElementById("messageBox");
    if (messageBox) {
      messageBox.innerText = message;
      messageBox.className = type; // type kan "error" of "success" zijn
      messageBox.style.display = "block";
      // Verberg het bericht na 5 seconden
      setTimeout(() => {
        messageBox.style.display = "none";
      }, 5000);
    } else {
      console.error(message);
    }
  }
  
  // Maak de functie globaal beschikbaar:
  window.displayMessage = displayMessage;
  