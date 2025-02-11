document.addEventListener("DOMContentLoaded", () => {
    const contactForm = document.getElementById("contact-form");

    if (!contactForm) {
        console.error("Contact form element is missing.");
        return;
    }

    // Submit event listener for contact form
    contactForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const formData = new FormData(contactForm);
        const formObject = Object.fromEntries(formData);

        try {
            const response = await fetch(contactForm.action, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formObject),
            });

            if (!response.ok) {
                throw new Error(`Error: ${response.statusText}`);
            }

            showMessage("✅ Your message has been sent successfully!", "success");
            contactForm.reset();
        } catch (error) {
            console.error("Error submitting the contact form:", error);
            showMessage("❌ Failed to send the message. Please try again.", "error");
        }
    });

    function showMessage(text, type) {
        const messageBox = document.createElement("div");
        messageBox.className = `message-box ${type}`;
        messageBox.textContent = text;
        document.body.appendChild(messageBox);
        setTimeout(() => {
            messageBox.remove();
        }, 5000);
    }
});
