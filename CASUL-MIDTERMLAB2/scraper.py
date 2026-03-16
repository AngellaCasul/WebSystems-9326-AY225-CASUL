import requests
from bs4 import BeautifulSoup
import re
import time
import json
import os
from datetime import datetime

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

ARTICLE_URLS = [
    "https://www.geeksforgeeks.org/introduction-to-r-programming-language/",
    "https://www.geeksforgeeks.org/r-data-types/",
    "https://www.geeksforgeeks.org/r-variables/",
    "https://www.geeksforgeeks.org/r-operators/",
    "https://www.geeksforgeeks.org/r-functions/",
    "https://www.geeksforgeeks.org/control-statements-in-r-programming/",
    "https://www.geeksforgeeks.org/loops-in-r/",
    "https://www.geeksforgeeks.org/r-data-frame/",
    "https://www.geeksforgeeks.org/r-lists/",
    "https://www.geeksforgeeks.org/r-vector/",
    "https://www.geeksforgeeks.org/r-matrix/",
    "https://www.geeksforgeeks.org/data-visualization-in-r/",
]


def scrape_article(url):
    try:
        response = requests.get(url, headers=HEADERS, timeout=15)
        response.raise_for_status()
    except Exception as e:
        return {
            "url": url,
            "title": "Not Available",
            "concepts": "Not Available",
            "difficulty": "Not Available",
            "code_snippets": ["Not Available"],
            "complexity": ["Not Available"],
            "related_links": [{"title": "Not Available", "url": ""}],
            "scraped_at": datetime.now().isoformat(),
        }

    soup = BeautifulSoup(response.text, "html.parser")

    # 1. TITLE
    title_tag = soup.find("h1")
    title = title_tag.get_text(strip=True) if title_tag else "Not Available"

    # 2. CONCEPTS
    concepts = "Not Available"
    containers = [
        soup.find("div", class_=re.compile(r"article--container", re.I)),
        soup.find("div", class_=re.compile(r"entry-content", re.I)),
        soup.find("article"),
        soup.find("main"),
    ]
    for container in containers:
        if container:
            for p in container.find_all("p"):
                text = p.get_text(strip=True)
                if len(text) > 100 and "cookie" not in text.lower() and "advertisement" not in text.lower():
                    concepts = text
                    break
        if concepts != "Not Available":
            break

    if concepts == "Not Available":
        for p in soup.find_all("p"):
            text = p.get_text(strip=True)
            if len(text) > 100 and "cookie" not in text.lower():
                concepts = text
                break

    # 3. DIFFICULTY
    difficulty = "Not Available"
    for tag in soup.find_all(True):
        text = tag.get_text(strip=True).lower()
        if text in ["easy", "medium", "hard", "basic", "expert"] and len(text) < 15:
            difficulty = text.capitalize()
            break

    if difficulty == "Not Available":
        combined = title.lower() + " " + concepts.lower()
        if any(w in combined for w in ["introduction", "basics", "what is", "overview", "getting started"]):
            difficulty = "Easy"
        elif any(w in combined for w in ["advanced", "optimization", "machine learning", "algorithm"]):
            difficulty = "Hard"
        else:
            difficulty = "Medium"

    # 4. CODE SNIPPETS
    code_snippets = []
    for block in soup.find_all("pre")[:3]:
        code_text = block.get_text(strip=True)
        if len(code_text) > 10:
            code_snippets.append(code_text)
    if not code_snippets:
        code_snippets = ["Not Available"]

    # 5. COMPLEXITY
    complexity = []
    for tag in soup.find_all(["p", "li", "td", "span", "div"]):
        text = tag.get_text(strip=True)
        if re.search(r'(time|space)\s*complexity', text, re.IGNORECASE):
            if 5 < len(text) < 400 and text not in complexity:
                complexity.append(text)

    if not complexity:
        for line in soup.get_text().splitlines():
            line = line.strip()
            if re.search(r'(time|space)\s*complexity', line, re.IGNORECASE):
                if 5 < len(line) < 300 and line not in complexity:
                    complexity.append(line)

    if not complexity:
        complexity = ["Not Available"]

    # 6. RELATED LINKS
    related_links = []
    seen = set()
    for a_tag in soup.find_all("a", href=True):
        href = a_tag["href"]
        link_text = a_tag.get_text(strip=True)
        if (
            href.startswith("https://www.geeksforgeeks.org/")
            and href != url
            and len(link_text) > 5
            and "#" not in href
            and href not in seen
        ):
            seen.add(href)
            related_links.append({"title": link_text, "url": href})
    related_links = related_links[:5]
    if not related_links:
        related_links = [{"title": "Not Available", "url": ""}]

    return {
        "url": url,
        "title": title,
        "concepts": concepts,
        "difficulty": difficulty,
        "code_snippets": code_snippets,
        "complexity": complexity,
        "related_links": related_links,
        "scraped_at": datetime.now().isoformat(),
    }


def run_scraper(progress_callback=None):
    """Scrapes all articles and saves to data/r_topics.json"""
    os.makedirs("data", exist_ok=True)
    results = []
    total = len(ARTICLE_URLS)

    for i, url in enumerate(ARTICLE_URLS):
        if progress_callback:
            progress_callback(f"Scraping article {i+1} of {total}: {url.split('/')[-2].replace('-', ' ').title()}")

        article = scrape_article(url)
        results.append(article)

        if i < total - 1:
            time.sleep(2)

    # Save to JSON
    with open("data/r_topics.json", "w", encoding="utf-8") as f:
        json.dump({
            "category": "R Programming Language",
            "generated_at": datetime.now().isoformat(),
            "total": len(results),
            "articles": results
        }, f, indent=2)

    if progress_callback:
        progress_callback(f"Done! Saved {len(results)} articles.")

    return results


def load_data():
    """Loads saved data from JSON file"""
    if os.path.exists("data/r_topics.json"):
        with open("data/r_topics.json", "r", encoding="utf-8") as f:
            data = json.load(f)
        return data.get("articles", [])
    return []


def has_data():
    return os.path.exists("data/r_topics.json")