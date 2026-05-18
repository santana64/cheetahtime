import urllib.request, urllib.parse, re, time

def fetch(url, timeout=8, follow=True):
    try:
        req = urllib.request.Request(url, headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
            "Accept": "text/html,*/*;q=0.8",
            "Accept-Language": "fr-FR,fr;q=0.9",
            "Accept-Encoding": "identity",
        })
        with urllib.request.urlopen(req, timeout=timeout) as r:
            raw = r.read(80000)
            return raw.decode(r.headers.get_content_charset() or "utf-8", errors="replace"), r.geturl()
    except Exception as e:
        return f"ERREUR: {e}", ""

EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,6}")
TEL_RE   = re.compile(r"(?:0[1-9])(?:[\s.\-]?\d{2}){4}")

siren = "378230064"
nom   = "BERNARD DEBOEUF"
cp    = "01120"

SKIP = {"r.bing.com","th.bing.com","microsoft.com","bing.com","pagesjaunes.fr",
        "societe.com","pappers.fr","google.com","facebook.com","instagram.com",
        "linkedin.com","youtube.com","wikipedia.org","leboncoin.fr"}

# --- Bing avec extraction URL depuis redirects ---
print("=== BING avec decode redirects ===")
q = f'"{nom}" {cp} artisan'
url = "https://www.bing.com/search?" + urllib.parse.urlencode({"q": q, "mkt": "fr-FR", "setlang": "fr"})
html, _ = fetch(url)
if "ERREUR" not in html:
    # Methode 1 : extraire URL= dans les redirects r.bing.com
    decoded_urls = re.findall(r'[&?]u=([a-zA-Z0-9%\-_\.~]+)', html)
    real_urls = []
    for enc in decoded_urls:
        try:
            dec = urllib.parse.unquote(enc)
            if dec.startswith("http") and not any(s in dec for s in SKIP):
                real_urls.append(dec)
        except Exception:
            pass

    # Methode 2 : cite elements
    cites = re.findall(r'<cite[^>]*>(.*?)</cite>', html, re.DOTALL)
    cite_urls = [re.sub(r'<[^>]+>', '', c).strip() for c in cites]

    # Methode 3 : href directs non-bing
    direct = re.findall(r'href="(https?://(?!r\.bing|th\.bing|www\.bing|microsoft)[a-zA-Z0-9\-\.]{4,50}\.[a-z]{2,5}[^"]{0,100})"', html)

    print(f"  Decoded URLs: {real_urls[:5]}")
    print(f"  Cite URLs: {cite_urls[:5]}")
    print(f"  Direct hrefs: {direct[:5]}")
    emails = EMAIL_RE.findall(html)
    print(f"  Emails: {emails[:5]}")

time.sleep(1)

# --- Societe.com : chercher tel et site dans le HTML ---
print()
print("=== SOCIETE.COM html complet ===")
html2, final_url = fetch(f"https://www.societe.com/cgi-bin/search?champs={siren}")
if "ERREUR" not in html2:
    # Cherche numero de telephone dans le HTML
    tels = TEL_RE.findall(html2)
    # Cherche site web dans data attributes ou variables JS
    sites_js = re.findall(r'"website"\s*:\s*"([^"]+)"', html2)
    sites_data = re.findall(r'data-url="(https?://(?!(?:www\.)?societe)[^"]{5,80})"', html2)
    # Cherche dans les meta tags
    meta_urls = re.findall(r'<meta[^>]+content="(https?://(?!(?:www\.)?societe)[^"]{5,80})"', html2)
    print(f"  Tels dans HTML: {tels[:5]}")
    print(f"  Sites JS: {sites_js[:3]}")
    print(f"  Sites data: {sites_data[:3]}")
    print(f"  Meta URLs: {meta_urls[:3]}")
    # Extrait un bout du HTML autour de "site" ou "web"
    idx = html2.lower().find("site web")
    if idx > 0:
        print(f"  Contexte 'site web': {html2[idx-50:idx+200]}")

time.sleep(1)

# --- pappers.fr avec bonne URL ---
print()
print("=== PAPPERS.FR ===")
# URL correcte : https://www.pappers.fr/entreprise/nom-siren
nom_slug = re.sub(r'\s+', '-', nom.lower())
html3, url3 = fetch(f"https://www.pappers.fr/entreprise/{nom_slug}-{siren}")
print(f"  URL finale: {url3}")
print(f"  Statut: {'OK len='+str(len(html3)) if 'ERREUR' not in html3 else html3[:120]}")
if "ERREUR" not in html3:
    tels3 = TEL_RE.findall(html3)
    sites3 = re.findall(r'href="(https?://(?!(?:www\.)?pappers)[^"]{5,80})"', html3)
    emails3 = EMAIL_RE.findall(html3)
    print(f"  Tels: {tels3[:3]} | Sites ext: {sites3[:3]} | Emails: {emails3[:3]}")
