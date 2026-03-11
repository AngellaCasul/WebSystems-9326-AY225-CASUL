# 🎮 PolyScrape — Polygon.com Game Scraper

A web scraping application built with **Python**, **Flask**, and **BeautifulSoup** that extracts game data from [Polygon.com](https://www.polygon.com) and displays it in an interactive web interface.

---

## 📋 Features

- Scrapes game data in real time from any valid Polygon.com page
- Extracts all required fields per game:
  - **Game Title**
  - **Release Date**
  - **Key Features**
  - **Platform Availability**
  - **Developer Information**
  - **Publisher Information**
- Automatically detects the page type and applies the correct scraping strategy
- Displays results in a responsive grid or list view
- Search and filter results by platform
- Exports scraped data to `games.json` and `games.csv` automatically
- Shows `"Not Available"` for any field not found on the website

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3, Flask |
| Scraping | Requests, BeautifulSoup4 |
| Frontend | HTML, CSS, JavaScript |
| Data Export | JSON, CSV |

---

## 📁 Project Structure

```
flask_app/
├── app.py                  # Flask server + all scraping logic
├── templates/
│   └── index.html          # Frontend HTML
├── static/
│   ├── style.css           # Styling
│   └── script.js           # Frontend JavaScript
├── games.json              # Auto-generated after scraping
├── games.csv               # Auto-generated after scraping
└── README.md               # This file
```

---

## ⚙️ Installation & Setup

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
cd YOUR_REPO_NAME/CASUL-MIDTERM-LAB-1/flask_app
```

### 2. Install dependencies
```bash
pip install flask requests beautifulsoup4
```

### 3. Run the app
```bash
python app.py
```

### 4. Open in browser
```
http://localhost:5000
```

---

## 🚀 How to Use

1. **Paste a Polygon.com URL** into the input field
2. **Click SCRAPE** — the server fetches and parses the page in real time
3. **Browse the results** — game cards appear with all extracted fields
4. **Search** by game title using the search bar
5. **Filter** by platform using the dropdown
6. **Toggle** between grid and list view using the buttons
7. **Data is saved** automatically to `games.json` and `games.csv` in the project folder

---

## 🔗 Supported URL Types

| URL Example | Type | Description |
|---|---|---|
| `polygon.com/reviews` | Listing page | Scrapes individual review articles |
| `polygon.com/gaming` | Listing page | Scrapes latest gaming articles |
| `polygon.com/best-ps5-games-playstation-5` | Best-of listicle | Extracts each game from h2/h3 headings |
| `polygon.com/best-switch-2-games` | Best-of listicle | Extracts each game from h2/h3 headings |
| `polygon.com/march-new-video-games-2026` | Bullet roundup | Extracts games from bold bullet points |

---

## 📊 Scraped Data Fields

| Field | Source |
|---|---|
| Game Title | `og:title` meta tag or `<h1>` |
| Release Date | `<time>` tag |
| Key Features | Deck/description paragraph |
| Platform Availability | Info box or keyword scan |
| Developer | `<dt>`/`<dd>` info table, bold labels, or text scan |
| Publisher | `<dt>`/`<dd>` info table, bold labels, or text scan |

> If a field is not available on the page, it will display as **"Not Available"** — no data is hardcoded.

---

## ⚠️ Important Notes

- All data is scraped **live** from Polygon.com — no game data is hardcoded in the source code
- Scraping takes a few seconds per game due to rate limiting delays (intentional, to be respectful to the server)
- Developer and Publisher fields are most complete on individual review pages (`polygon.com/reviews`)
- This project is for **educational purposes only**

---

## 👩‍💻 Author

**Angella Casul** — Web Systems Lab Project  
Course: WebSystems-9326-AY225