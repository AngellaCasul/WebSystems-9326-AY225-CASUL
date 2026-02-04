// Sample program data - replace with actual programs
const programs = [
  {
    name: "Technical Workshop Series",
    category: "Skills Development",
    description: "Hands-on workshops covering various programming languages, frameworks, and tools used in the industry.",
    benefits: "Learn practical skills, build projects, and earn certificates of completion.",
    image: "images/languages.png"
  },
  {
    name: "Leadership Development Program",
    category: "Professional Growth",
    description: "Training sessions focused on developing leadership skills, team management, and organizational abilities.",
    benefits: "Enhance your leadership capabilities and prepare for future roles in tech organizations.",
    image: "images/leadership.jpg"
  },
  {
    name: "Industry Mentorship",
    category: "Career Development",
    description: "Connect with IT professionals and industry experts who provide guidance and career advice.",
    benefits: "Gain insights from experienced professionals and expand your professional network.",
    image: "images/industry.png"
  },
  {
    name: "Coding Bootcamp",
    category: "Skills Development",
    description: "Intensive coding training covering full-stack development, algorithms, and software engineering practices.",
    benefits: "Master in-demand programming skills and build a portfolio of projects.",
    image: "images/bootcamp.jpg"
  },
  {
    name: "Tech Talk Series",
    category: "Knowledge Sharing",
    description: "Regular seminars featuring guest speakers from leading tech companies discussing industry trends.",
    benefits: "Stay updated with the latest technology trends and innovations.",
    image: "images/tech-talks.jpg"
  },
  {
    name: "Community Outreach",
    category: "Social Impact",
    description: "Initiatives to promote digital literacy and technology education in local communities.",
    benefits: "Make a positive impact while developing teaching and communication skills.",
    image: "images/community.jpg"
  },
  {
    name: "Hackathon Participation",
    category: "Competition",
    description: "Team-based coding competitions where students solve real-world problems within limited timeframes.",
    benefits: "Test your skills, collaborate with peers, and win prizes while solving challenging problems.",
    image: "images/hackathon.jpg"
  },
  {
    name: "Career Preparation Program",
    category: "Career Development",
    description: "Resume workshops, mock interviews, and job search strategies tailored for IT careers.",
    benefits: "Prepare effectively for internships and job applications in the tech industry.",
    image: "images/career.jpg"
  },
  {
    name: "Project Incubator",
    category: "Innovation",
    description: "Support for student-led tech projects and startup ideas with mentorship and resources.",
    benefits: "Turn your ideas into reality with guidance from experienced mentors and access to resources.",
    image: "images/incubator.jpg"
  }
];

const list = document.getElementById("programList");

function renderPrograms() {
  // Create grid container
  const grid = document.createElement("div");
  grid.className = "officer-grid"; // Reusing the same grid styling
  grid.style.cssText = "display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 30px; margin-top: 40px;";

  programs.forEach(program => {
    const card = document.createElement("div");
    card.className = "officer-card fade"; // Reusing card styling
    
    card.innerHTML = `
      <img src="${program.image}" alt="${program.name}" class="officer-image" style="border-radius: 15px;">
      <h3 style="margin-top: 20px;">${program.name}</h3>
      <p style="color: var(--purple-light); font-weight: 600; font-size: 1rem;">${program.category}</p>
      <p style="margin-top: 10px; font-size: 0.95rem; opacity: 0.8;">${program.description.substring(0, 100)}...</p>
    `;
    
    card.onclick = () => openProgram(program);
    grid.appendChild(card);

    // Re-observe for animation
    observer.observe(card);
  });

  list.appendChild(grid);
}

function openProgram(program) {
  document.getElementById("programName").textContent = program.name;
  document.getElementById("programCategory").textContent = program.category;
  document.getElementById("programDesc").textContent = program.description;
  document.getElementById("programBenefits").innerHTML = `<strong style="color: var(--purple);">Benefits:</strong> ${program.benefits}`;
  document.getElementById("programModal").style.display = "flex";
}

function closeProgram() {
  document.getElementById("programModal").style.display = "none";
}

// Render programs on page load
renderPrograms();