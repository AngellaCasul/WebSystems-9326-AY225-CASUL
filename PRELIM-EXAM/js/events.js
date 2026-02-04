const events = [
  { 
    name: "Web Development Workshop",
    type: "Workshop",
    description: "Learn modern web development techniques including HTML5, CSS3, and JavaScript frameworks. Build responsive websites from scratch.",
    date: "March 15, 2026"
  },
  { 
    name: "Technology Seminar",
    type: "Seminar",
    description: "Industry experts share insights on emerging technologies, career opportunities, and the future of IT in the Philippines.",
    date: "March 22, 2026"
  },
  { 
    name: "Python Programming Workshop",
    type: "Workshop",
    description: "Master Python fundamentals and explore data science, automation, and web development applications.",
    date: "April 5, 2026"
  },
  { 
    name: "Cybersecurity Awareness Seminar",
    type: "Seminar",
    description: "Learn about protecting digital assets, understanding threats, and implementing security best practices.",
    date: "April 12, 2026"
  }
];

const list = document.getElementById("eventList");
const filter = document.getElementById("filter");

function render(type) {
  list.innerHTML = "";

  const filtered = events.filter(e => type === "all" || e.type === type);

  if (filtered.length === 0) {
    list.innerHTML = '<p style="text-align: center; font-size: 1.2rem; margin: 40px 0;">No events found for this category.</p>';
    return;
  }

  // Create grid
  const grid = document.createElement("div");
  grid.style.cssText = "display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 30px; margin-top: 30px;";

  filtered.forEach(e => {
    const card = document.createElement("div");
    card.className = "card fade";
    
    card.innerHTML = `
      <h3 style="color: var(--purple); margin-bottom: 10px; font-size: 1.5rem;">${e.name}</h3>
      <p style="color: var(--purple-light); font-weight: 600; margin-bottom: 15px;">${e.type} • ${e.date}</p>
      <p style="line-height: 1.8;">${e.description}</p>
    `;
    
    card.onclick = () => openModal(e);
    grid.appendChild(card);

    // 🔥 Re-observe for animation
    observer.observe(card);
  });

  list.appendChild(grid);
}

filter.onchange = () => {
  localStorage.setItem("eventFilter", filter.value);
  render(filter.value);
};

// Load saved filter or show all
const savedFilter = localStorage.getItem("eventFilter") || "all";
filter.value = savedFilter;
render(savedFilter);

function openModal(event) {
  document.getElementById("modalText").innerHTML = `
    <strong style="font-size: 1.4rem; color: var(--purple); display: block; margin-bottom: 10px;">${event.name}</strong>
    <span style="color: var(--purple-light); font-weight: 600;">${event.type} • ${event.date}</span>
    <br><br>
    ${event.description}
  `;
  document.getElementById("modal").style.display = "flex";
}

function closeModal() {
  document.getElementById("modal").style.display = "none";
}