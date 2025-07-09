// Waitlist form handling
class WaitlistClient {
  constructor() {
    this.baseUrl = window.location.origin;
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.loadStats();
  }

  setupEventListeners() {
    const form = document.getElementById("waitlistForm");
    const emailInput = document.getElementById("email");

    form.addEventListener("submit", this.handleSubmit.bind(this));
    emailInput.addEventListener("input", this.handleEmailInput.bind(this));
  }

  async handleSubmit(e) {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const wantsUpdates = document.getElementById("updates").checked;

    if (!this.isValidEmail(email)) {
      this.showError("Please enter a valid email address");
      return;
    }

    this.setLoading(true);
    this.hideMessages();

    try {
      const response = await fetch("/.netlify/functions/add-to-waitlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,
          wantsUpdates: wantsUpdates,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        this.showSuccess();
        document.getElementById("waitlistForm").reset();
        this.loadStats(); // Refresh stats
      } else {
        this.showError(
          data.message || "Something went wrong. Please try again."
        );
      }
    } catch (error) {
      console.error("Error:", error);
      this.showError(
        "Network error. Please check your connection and try again."
      );
    } finally {
      this.setLoading(false);
    }
  }

  handleEmailInput(e) {
    const email = e.target.value;
    const isValid = this.isValidEmail(email);

    if (email && !isValid) {
      e.target.setCustomValidity("Please enter a valid email address");
    } else {
      e.target.setCustomValidity("");
    }
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  async loadStats() {
    try {
      const response = await fetch("/.netlify/functions/get-stats");
      const data = await response.json();

      if (response.ok) {
        const count = data.count || 0;
        const displayCount = Math.max(950, count + 950); 
        document.getElementById("waitlistCount").textContent =
          displayCount.toLocaleString();
      }
    } catch (error) {
      console.error("Error loading stats:", error);
      document.getElementById("waitlistCount").textContent = "1,000+";
    }
  }

  setLoading(isLoading) {
    const submitButton = document.getElementById("submitButton");
    const buttonText = document.getElementById("buttonText");
    const buttonSpinner = document.getElementById("buttonSpinner");

    submitButton.disabled = isLoading;

    if (isLoading) {
      buttonText.classList.add("hidden");
      buttonSpinner.classList.remove("hidden");
    } else {
      buttonText.classList.remove("hidden");
      buttonSpinner.classList.add("hidden");
    }
  }

  showSuccess() {
    document.getElementById("successMessage").classList.remove("hidden");
    setTimeout(() => {
      document.getElementById("successMessage").classList.add("hidden");
    }, 5000);
  }

  showError(message) {
    document.getElementById("errorText").textContent = message;
    document.getElementById("errorMessage").classList.remove("hidden");
    setTimeout(() => {
      document.getElementById("errorMessage").classList.add("hidden");
    }, 5000);
  }

  hideMessages() {
    document.getElementById("successMessage").classList.add("hidden");
    document.getElementById("errorMessage").classList.add("hidden");
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new WaitlistClient();
});
