import urllib.request, urllib.parse, re

def fetch(url, timeout=8):
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
LINK_RE  = re.compile(r'href="(https?://[a-zA-Z0-9\-\.]+\.[a-z]{2,5}[^"]{0,100})"')
TEL_RE   = re.compile(r"(?:0[1-9])(?:[\s.\-]?\d{2}){4}")

siren = "378230064"
nom   = "BERNARD DEBOEUF"
cp    = "01120"
ville = "MONTLUEL"

# Test societe.com search
print("=== societe.com search ===")
html, final_url = fetch(f"https://www.societe.com/cgi-bin/search?champs={siren}")
print(f"  URL finale: {final_url}")
print(f"  Statut: {'OK len='+str(len(html)) if 'ERREUR' not in html else html[:120]}")
if "ERREUR" not in html:
    links = [u for u in LINK_RE.findall(html) if "societe.com" not in u]
    emails = EMAIL_RE.findall(html)
    print(f"  Liens ext: {links[:5]}")
    print(f"  Emails: {emails[:5]}")

import time; time.sleep(1)

# Test Bing search
print()
print("=== BING ===")
q = f'"{nom}" {cp} artisan email'
url = "https://www.bing.com/search?" + urllib.parse.urlencode({"q": q, "mkt": "fr-FR"})
html, _ = fetch(url)
print(f"  Statut: {'OK len='+str(len(html)) if 'ERREUR' not in html else html[:120]}")
if "ERREUR" not in html:
    links = LINK_RE.findall(html)
    emails = EMAIL_RE.findall(html)
    tels = TEL_RE.findall(html)
    print(f"  Liens: {links[:6]}")
    print(f"  Emails: {emails[:5]}")
    print(f"  Tels: {tels[:3]}")

time.sleep(1)

# Test annuaire-gratuit.fr
print()
print("=== ANNUAIRE-GRATUIT.FR ===")
q2 = urllib.parse.quote_plus(nom)
html2, _ = fetch(f"https://www.annuaire-gratuit.fr/search?q={q2}&cp={cp}")
print(f"  Statut: {'OK len='+str(len(html2)) if 'ERREUR' not in html2 else html2[:120]}")
if "ERREUR" not in html2:
    emails2 = EMAIL_RE.findall(html2)
    tels2 = TEL_RE.findall(html2)
    print(f"  Emails: {emails2[:5]}")
    print(f"  Tels: {tels2[:3]}")

time.sleep(1)

# Test hoodspot
print()
print("=== HOODSPOT.FR ===")
q3 = urllib.parse.quote_plus(f"{nom} {ville}")
html3, final3 = fetch(f"https://hoodspot.fr/search?q={q3}")
print(f"  URL: {final3} | Statut: {'OK len='+str(len(html3)) if 'ERREUR' not in html3 else html3[:120]}")
if "ERREUR" not in html3:
    emails3 = EMAIL_RE.findall(html3)
    tels3 = TEL_RE.findall(html3)
    print(f"  Emails: {emails3[:5]} | Tels: {tels3[:3]}")

time.sleep(1)

# Test pages blanches numero mobile
print()
print("=== PAGESJAUNES MOBILE ===")
q4 = urllib.parse.quote_plus(nom)
html4, _ = fetch(f"https://www.pagesjaunes.fr/pagesblanches/recherche?quoi={q4}&ou={cp}")
print(f"  Statut: {'OK len='+str(len(html4)) if 'ERREUR' not in html4 else html4[:120]}")
if "ERREUR" not in html4:
    emails4 = EMAIL_RE.findall(html4)
    tels4 = TEL_RE.findall(html4)
    print(f"  Emails: {emails4[:5]} | Tels: {tels4[:3]}")
