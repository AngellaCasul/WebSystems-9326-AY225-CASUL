// DARK MODE
const toggle = document.getElementById("darkToggle");

if (toggle) {
  // Check saved preference
  if (localStorage.getItem("dark") === "on") {
    document.body.classList.add("dark");
    toggle.textContent = "☀️ Light Mode";
  }

  toggle.onclick = () => {
    document.body.classList.toggle("dark");
    const isDark = document.body.classList.contains("dark");
    
    localStorage.setItem("dark", isDark ? "on" : "off");
    toggle.textContent = isDark ? "☀️ Light Mode" : "🌙 Dark Mode";
  };
}

// GLOBAL INTERSECTION OBSERVER
window.observer = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("show");
      }
    });
  },
  {
    threshold: 0.1,
    rootMargin: "0px 0px -50px 0px"
  }
);

// OBSERVE EXISTING FADE ELEMENTS
document.querySelectorAll(".fade").forEach(el => {
  observer.observe(el);
});