const form = document.getElementById("contactForm");
const nameInput = document.getElementById("name");
const emailInput = document.getElementById("email");
const messageInput = document.getElementById("message");
const status = document.getElementById("status");

// Load saved data
nameInput.value = localStorage.getItem("contactName") || "";
emailInput.value = localStorage.getItem("contactEmail") || "";
messageInput.value = localStorage.getItem("contactMessage") || "";

form.onsubmit = e => {
  e.preventDefault();

  if (
    !nameInput.value ||
    !emailInput.value.includes("@") ||
    messageInput.value.length < 5
  ) {
    status.innerText = "Please fill out all fields correctly.";
    status.style.color = "var(--purple)";
    status.style.background = "var(--card)";
    return;
  }

  localStorage.setItem("contactName", nameInput.value);
  localStorage.setItem("contactEmail", emailInput.value);
  localStorage.setItem("contactMessage", messageInput.value);

  status.innerText = "✅ Message sent successfully! We'll get back to you soon.";
  status.style.color = "#22c55e";
  status.style.background = "var(--card)";
  
  setTimeout(() => {
    form.reset();
    localStorage.removeItem("contactName");
    localStorage.removeItem("contactEmail");
    localStorage.removeItem("contactMessage");
  }, 2000);
};