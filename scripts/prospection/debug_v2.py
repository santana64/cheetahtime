import urllib.request, urllib.parse, re

def fetch(url, timeout=6):
    try:
        req = urllib.request.Request(url, headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
            "Accept": "text/html,*/*;q=0.8",
            "Accept-Language": "fr-FR,fr;q=0.9",
            "Accept-Encoding": "identity",
        })
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.read(80000).decode(r.headers.get_content_charset() or "utf-8", errors="replace")
    except Exception as e:
        return f"ERREUR: {e}"

EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,6}")
LINK_RE  = re.compile(r'href="(https?://[a-zA-Z0-9\-\.]+\.[a-z]{2,5}[^"]{0,80})"')

# Test BERNARD DEBOEUF siren=378230064 cp=01120
print("=== SOCIETE.COM ===")
html = fetch("https://www.societe.com/societe/378230064.html")
print(f"  Statut: {'OK len='+str(len(html)) if 'ERREUR' not in html else html[:100]}")
if "ERREUR" not in html:
    links = [u for u in LINK_RE.findall(html) if "societe.com" not in u]
    emails = EMAIL_RE.findall(html)
    print(f"  Liens ext: {links[:5]}")
    print(f"  Emails: {emails[:5]}")

print()
print("=== DDG nom exact ===")
q = '"BERNARD DEBOEUF" 01120 peintre'
url = "https://html.duckduckgo.com/html/?" + urllib.parse.urlencode({"q": q, "kl": "fr-fr"})
html = fetch(url)
print(f"  Statut: {'OK len='+str(len(html)) if 'ERREUR' not in html else html[:100]}")
if "ERREUR" not in html:
    links = LINK_RE.findall(html)
    emails = EMAIL_RE.findall(html)
    print(f"  Liens: {links[:8]}")
    print(f"  Emails: {emails[:5]}")

print()
print("=== SPRAYDECOR (FREDERIC CHERRIER siren=479213134) ===")
html = fetch("https://www.societe.com/societe/479213134.html")
print(f"  Statut: {'OK len='+str(len(html)) if 'ERREUR' not in html else html[:100]}")
if "ERREUR" not in html:
    links = [u for u in LINK_RE.findall(html) if "societe.com" not in u]
    emails = EMAIL_RE.findall(html)
    print(f"  Liens ext: {links[:5]}")
    print(f"  Emails: {emails[:5]}")

print()
print("=== DDG SPRAYDECOR ===")
q2 = '"SPRAYDECOR" 01600 contact'
url2 = "https://html.duckduckgo.com/html/?" + urllib.parse.urlencode({"q": q2, "kl": "fr-fr"})
html2 = fetch(url2)
print(f"  Statut: {'OK len='+str(len(html2)) if 'ERREUR' not in html2 else html2[:100]}")
if "ERREUR" not in html2:
    links2 = LINK_RE.findall(html2)
    emails2 = EMAIL_RE.findall(html2)
    print(f"  Liens: {links2[:8]}")
    print(f"  Emails: {emails2[:5]}")

print()
print("=== QUALIBAT SPRAYDECOR ===")
url3 = "https://www.qualibat.com/trouver-une-entreprise/?q=SPRAYDECOR"
html3 = fetch(url3)
print(f"  Statut: {'OK len='+str(len(html3)) if 'ERREUR' not in html3 else html3[:100]}")
if "ERREUR" not in html3:
    emails3 = EMAIL_RE.findall(html3)
    tels3 = re.findall(r"(?:0[1-9])(?:[\s.\-]?\d{2}){4}", html3)
    print(f"  Emails: {emails3[:5]} | Tels: {tels3[:3]}")
