document.addEventListener("DOMContentLoaded", () => {
    const coinForm = document.getElementById("coin-form");
    const exchangeForm = document.getElementById("exchange-form");
    const chooseCoin = document.getElementById("choose-coin");
    const chooseExchange = document.getElementById("choose-exchange");

    if (!coinForm || !exchangeForm || !chooseCoin || !chooseExchange) {
        console.error("One or more required elements are missing.");
        return;
    }

    chooseCoin.addEventListener("click", () => {
        coinForm.classList.remove("hidden");
        exchangeForm.classList.add("hidden");
    });

    chooseExchange.addEventListener("click", () => {
        exchangeForm.classList.remove("hidden");
        coinForm.classList.add("hidden");
    });

    // Voeg event listener toe aan elk formulier
    document.querySelectorAll("form").forEach((form) => {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            const formObject = Object.fromEntries(formData);
            try {
                const response = await fetch(form.action, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(formObject),
                });

                if (!response.ok) {
                    throw new Error(`Error: ${response.statusText}`);
                }

                alert("Form successfully submitted!");
                form.reset();
            } catch (error) {
                console.error("Error submitting the form:", error);
                alert("Failed to submit the form. Please try again.");
            }
        });
    });
});
