from flask import Flask, render_template, request, jsonify
import requests
from bs4 import BeautifulSoup
import json
import csv
import re
import time
from datetime import datetime

app = Flask(__name__)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}

DOMAIN = "https://www.polygon.com"

SKIP_TITLES = {
    "reviews", "gaming", "games", "news", "features", "guides", "polygon",
    "subscribe to polygon", "polygon staff", "polygon recommends",
    "the verge", "vox media", "advertise with us", "most popular",
    "related", "more", "read more", "newsletter", "comments",
    "how we pick the best games on ps5", "how we chose", "our methodology",
}

LISTICLE_PREFIXES = (
    "the best", "best games", "best ps", "best xbox", "best nintendo",
    "best pc", "best switch", "top games", "top 10", "top 25", "top 20",
    "the 10", "the 20", "the 25", "the 50", "ranked:", "every ",
    "10 new", "new video games", "new games to", "games to play",
    "games coming", "games releasing", "games in ", "games of ",
    "how we pick", "how we chose",
)

NON_GAME_HEADINGS = {
    "most popular", "related", "more from polygon", "newsletter",
    "what to buy", "what to play", "editor's picks", "trending",
    "advertisement", "sponsored", "comments", "share this",
    "table of contents", "jump to", "how we chose", "our picks",
    "why trust us", "about this list", "update", "note",
    "how we pick the best games on ps5", "also worth playing",
    "honorable mentions", "what to look for",
}

SKIP_PHRASES = [
    "want to know how a new release",
    "polygon reviews team",
    "the latest games",
    "here to help",
    "polygon is a gaming website",
    "subscribing, you agree",
    "has been covering",
    "is a writer", "is an editor", "is a reporter",
]


def get_soup(url):
    response = requests.get(url, headers=HEADERS, timeout=15)
    response.raise_for_status()
    return BeautifulSoup(response.text, "html.parser")


def is_listing_page(soup):
    dated = [
        a["href"] for a in soup.find_all("a", href=True)
        if re.search(r"/\d{4}/\d{1,2}/\d{1,2}/[a-z0-9-]+", a["href"])
    ]
    return len(dated) >= 8


def extract_image(soup):
    og = soup.find("meta", property="og:image")
    if og and og.get("content"):
        return og["content"].strip()
    tw = soup.find("meta", attrs={"name": "twitter:image"})
    if tw and tw.get("content"):
        return tw["content"].strip()
    return None


def extract_structured_info(soup):
    info = {
        "developer": "Not Available",
        "publisher": "Not Available",
        "platform": "Not Available",
        "release_date": "Not Available",
    }
    page_text = soup.get_text(" ", strip=True)

    time_tag = soup.find("time")
    if time_tag:
        dt = time_tag.get("datetime", "")
        info["release_date"] = dt[:10] if dt else time_tag.get_text(strip=True)[:10]

    label_map = {
        "developer": "developer", "developed by": "developer",
        "publisher": "publisher", "published by": "publisher",
        "platform": "platform", "platforms": "platform",
        "available on": "platform", "release date": "release_date",
    }
    for label_key, field in label_map.items():
        if info[field] != "Not Available":
            continue
        pattern = re.compile(
            r"(?<!\w)" + re.escape(label_key) + r"[:\s]+([A-Z][^\n\r]{2,60}?)(?:\s{2,}|\n|$)",
            re.IGNORECASE
        )
        match = pattern.search(page_text)
        if match:
            val = match.group(1).strip().rstrip(".,;")
            if len(val.split()) <= 8 and not re.search(
                r"\b(the|is|are|was|were|to|and|but|for|that|which|who)\b", val, re.I
            ):
                info[field] = val

    if info["platform"] == "Not Available":
        plat_found = re.findall(
            r"\b(PlayStation\s*5|PlayStation\s*4|PS5|PS4|Xbox Series [XS]|Xbox One|"
            r"Nintendo Switch|PC|Steam|iOS|Android|Mac)\b",
            page_text, re.IGNORECASE
        )
        if plat_found:
            norm, seen_p = [], set()
            for p in plat_found:
                p = re.sub(r"PS5", "PlayStation 5", p, flags=re.I)
                p = re.sub(r"PS4", "PlayStation 4", p, flags=re.I)
                if p.lower() not in seen_p:
                    seen_p.add(p.lower())
                    norm.append(p)
            info["platform"] = ", ".join(norm[:4])

    return info


def extract_game_title(soup):
    og = soup.find("meta", property="og:title")
    if og and og.get("content"):
        raw = og["content"].strip()
        title = re.sub(r"\s*[-–:|]\s*(review|polygon).*$", "", raw, flags=re.IGNORECASE).strip()
        if title and len(title) > 1:
            return title
    h1 = soup.find("h1")
    if h1:
        raw = h1.get_text(strip=True)
        title = re.sub(r"\s*[-–:|]\s*(review|polygon).*$", "", raw, flags=re.IGNORECASE).strip()
        if title and len(title) > 1:
            return title
    return "Not Available"


def scrape_game_page(url):
    try:
        soup = get_soup(url)
    except Exception:
        return None

    title = extract_game_title(soup)
    structured = extract_structured_info(soup)
    image_url = extract_image(soup)

    key_features = "Not Available"
    deck = (soup.find("div", class_=re.compile(r"\bdeck\b", re.I))
            or soup.find("p", class_=re.compile(r"\bdeck\b", re.I)))
    if deck:
        key_features = deck.get_text(strip=True)
    else:
        article = soup.find("article") or soup.find("main") or soup
        for p in article.find_all("p"):
            text = p.get_text(strip=True)
            if len(text) > 100 and not re.search(r"cookie|privacy|subscribe|newsletter", text, re.I):
                key_features = text[:300] + ("..." if len(text) > 300 else "")
                break

    score = "Not Available"
    score_tag = soup.find(class_=re.compile(r"\bscore\b|\brating\b|\bgrade\b", re.I))
    if score_tag:
        score_text = score_tag.get_text(strip=True)
        if re.match(r"^\d+(\.\d+)?(/\d+)?$", score_text):
            score = score_text

    return {
        "title": title,
        "image_url": image_url,
        "release_date": structured["release_date"],
        "key_features": key_features,
        "platform": structured["platform"],
        "developer": structured["developer"],
        "publisher": structured["publisher"],
        "score": score,
        "source_url": url,
        "scraped_at": datetime.utcnow().isoformat() + "Z",
    }


def is_valid_game(game):
    title = game["title"].lower()
    if title in SKIP_TITLES:
        return False
    if any(title.startswith(p) for p in LISTICLE_PREFIXES):
        return False
    key_feat = game.get("key_features", "").lower()
    if any(phrase in key_feat for phrase in SKIP_PHRASES):
        return False
    if game["title"] == "Not Available":
        return False
    return True


def scrape_listing_page(soup, target):
    """For category pages like /reviews or /gaming."""
    links, seen = [], set()
    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        full = href if href.startswith("http") else DOMAIN + href
        if "polygon.com" not in full:
            continue
        if re.search(r"/\d{4}/\d{1,2}/\d{1,2}/[a-z0-9-]+", full) and full not in seen:
            seen.add(full)
            links.append(full)

    games, seen_titles = [], set()
    for link in links:
        if len(games) >= target:
            break
        game = scrape_game_page(link)
        if not game or not is_valid_game(game):
            continue
        tk = game["title"].lower().strip()
        if tk in seen_titles:
            continue
        seen_titles.add(tk)
        games.append(game)
        time.sleep(0.8)
    return games


def scrape_article_page(soup, page_url, target):
    """For best-of listicles — follows each h2/h3 linked game page."""
    article = soup.find("article") or soup.find("main") or soup
    article_image = extract_image(soup)
    article_date = ""
    time_tag = soup.find("time")
    if time_tag:
        dt = time_tag.get("datetime", "")
        article_date = dt[:10] if dt else time_tag.get_text(strip=True)[:10]

    games = []
    seen_titles = set()

    for heading in article.find_all(["h2", "h3"]):
        raw = heading.get_text(strip=True)
        clean_title = re.sub(r"^\d+[\.):\s]+", "", raw).strip()
        if not clean_title or len(clean_title) < 3 or len(clean_title.split()) > 10:
            continue
        if clean_title.lower() in NON_GAME_HEADINGS:
            continue
        if any(clean_title.lower().startswith(p) for p in LISTICLE_PREFIXES):
            continue

        tk = clean_title.lower()
        if tk in seen_titles:
            continue
        seen_titles.add(tk)

        key_features = "Not Available"
        nearby_image = article_image
        game_link = None

        link_tag = heading.find("a", href=True)
        if link_tag:
            href = link_tag["href"].strip()
            full = href if href.startswith("http") else DOMAIN + href
            if "polygon.com" in full and full.rstrip("/") != page_url.rstrip("/"):
                game_link = full

        sibling = heading.find_next_sibling()
        paragraphs = []
        while sibling and sibling.name not in ["h2", "h3"]:
            if sibling.name == "p":
                text = sibling.get_text(strip=True)
                if len(text) > 30:
                    paragraphs.append(text)
                if not game_link:
                    for a in sibling.find_all("a", href=True):
                        href = a["href"].strip()
                        full = href if href.startswith("http") else DOMAIN + href
                        if "polygon.com" in full and full.rstrip("/") != page_url.rstrip("/"):
                            if re.search(r"/\d{4}/\d{1,2}/\d{1,2}/", full) or len(full.split("/")) >= 5:
                                game_link = full
                                break
            if sibling.name in ["figure", "div", "picture"]:
                img = sibling.find("img", src=True)
                if img:
                    src = img.get("src", "").strip()
                    if src and not src.startswith("data:") and not src.endswith(".svg"):
                        nearby_image = ("https:" + src) if src.startswith("//") else src
            sibling = sibling.find_next_sibling()

        if paragraphs:
            combined = " ".join(paragraphs[:2])
            key_features = combined[:300] + ("..." if len(combined) > 300 else "")

        if game_link:
            try:
                linked_game = scrape_game_page(game_link)
                if linked_game and linked_game["title"] != "Not Available":
                    linked_game["title"] = clean_title
                    if key_features != "Not Available":
                        linked_game["key_features"] = key_features
                    if linked_game["image_url"] is None:
                        linked_game["image_url"] = nearby_image
                    games.append(linked_game)
                    time.sleep(0.6)
                    continue
            except Exception:
                pass

        platform = "Not Available"
        if key_features != "Not Available":
            plat_found = re.findall(
                r"\b(PlayStation\s*5|PlayStation\s*4|PS5|PS4|Xbox Series [XS]|"
                r"Xbox One|Nintendo Switch|PC|Steam|iOS|Android|Mac)\b",
                key_features, re.IGNORECASE
            )
            if plat_found:
                norm, seen_p = [], set()
                for p in plat_found:
                    p = re.sub(r"PS5", "PlayStation 5", p, flags=re.I)
                    p = re.sub(r"PS4", "PlayStation 4", p, flags=re.I)
                    if p.lower() not in seen_p:
                        seen_p.add(p.lower())
                        norm.append(p)
                platform = ", ".join(norm[:4])

        games.append({
            "title": clean_title,
            "image_url": nearby_image,
            "release_date": article_date,
            "key_features": key_features,
            "platform": platform,
            "developer": "Not Available",
            "publisher": "Not Available",
            "score": "Not Available",
            "source_url": game_link or page_url,
            "scraped_at": datetime.utcnow().isoformat() + "Z",
        })

    return games[:target]


def scrape_bullet_page(soup, page_url, target):
    """For roundup articles with bulleted game lists like /march-new-video-games-2026/."""
    article = soup.find("article") or soup.find("main") or soup
    article_date = ""
    time_tag = soup.find("time")
    if time_tag:
        dt = time_tag.get("datetime", "")
        article_date = dt[:10] if dt else time_tag.get_text(strip=True)[:10]

    games = []
    seen_titles = set()

    for li in article.find_all("li"):
        bold = li.find(["strong", "b", "em", "i"])
        if not bold:
            continue
        title = re.sub(r"[,;:]+$", "", bold.get_text(strip=True)).strip()
        if not title or len(title) < 2 or len(title.split()) > 12:
            continue
        if title.lower() in NON_GAME_HEADINGS:
            continue
        # Skip if it looks like a nav/UI label (all lowercase single word)
        if len(title.split()) == 1 and title.islower():
            continue

        tk = title.lower()
        if tk in seen_titles:
            continue
        seen_titles.add(tk)

        full_text = li.get_text(strip=True)

        # Extract release date e.g. "March 5" or "Feb. 27"
        date_match = re.search(
            r"(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|"
            r"Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|"
            r"Dec(?:ember)?)\.?\s+\d{1,2}",
            full_text, re.IGNORECASE
        )
        release = date_match.group(0) if date_match else article_date

        # Extract platform from parentheses e.g. "(PS5, Switch 2, Windows PC)"
        plat_match = re.search(r"\(([^)]+)\)", full_text)
        platform = plat_match.group(1).strip() if plat_match else "Not Available"

        # Find a link inside the li
        source_url = page_url
        for a_tag in li.find_all("a", href=True):
            href = a_tag["href"].strip()
            full_url = href if href.startswith("http") else DOMAIN + href
            if "polygon.com" in full_url and full_url.rstrip("/") != page_url.rstrip("/"):
                source_url = full_url
                break

        games.append({
            "title": title,
            "image_url": None,   # no per-game image on bullet pages
            "release_date": release,
            "key_features": full_text,
            "platform": platform,
            "developer": "Not Available",
            "publisher": "Not Available",
            "score": "Not Available",
            "source_url": source_url,
            "scraped_at": datetime.utcnow().isoformat() + "Z",
        })

    return games[:target]


def has_bullet_games(soup):
    """Returns True if the page is a bullet-point game roundup."""
    article = soup.find("article") or soup.find("main") or soup
    bullet_count = 0
    for li in article.find_all("li"):
        bold = li.find(["strong", "b"])
        if bold and len(bold.get_text(strip=True)) > 2:
            bullet_count += 1
    return bullet_count >= 2


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/scrape", methods=["POST"])
def scrape():
    try:
        data = request.get_json(force=True, silent=True) or {}
        url = data.get("url", "").strip()
        target = int(data.get("count", 25))

        if not url:
            return jsonify({"error": "No URL provided"}), 400

        if not re.match(r"https?://(www\.)?polygon\.com", url):
            return jsonify({"error": "Only Polygon.com URLs are supported"}), 400

        try:
            soup = get_soup(url)
        except Exception as e:
            return jsonify({"error": f"Could not fetch URL: {str(e)}"}), 500

        if is_listing_page(soup):
            games = scrape_listing_page(soup, target)
        elif has_bullet_games(soup):
            games = scrape_bullet_page(soup, url, target)
        else:
            games = scrape_article_page(soup, url, target)

        if not games:
            return jsonify({"error": "Could not find any games on that page. Try polygon.com/reviews or polygon.com/best-ps5-games-playstation-5"}), 500

        with open("games.json", "w", encoding="utf-8") as f:
            json.dump(games, f, indent=2, ensure_ascii=False)

        with open("games.csv", "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=games[0].keys())
            writer.writeheader()
            writer.writerows(games)

        return jsonify({"games": games, "count": len(games)})

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Server error: {str(e)}"}), 500


if __name__ == "__main__":
    app.run(debug=True, port=5000)