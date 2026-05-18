import urllib.request, json, urllib.parse, re

# Test 1 - ADEME par SIRET
siret = "37823006400016"
siren = siret[:9]
url = f"https://data.ademe.fr/data-fair/api/v1/datasets/liste-des-entreprises-rge-2/lines?q={siren}&q_fields=siret&size=5"
req = urllib.request.Request(url, headers={"User-Agent": "test/1.0"})
with urllib.request.urlopen(req, timeout=10) as r:
    d = json.loads(r.read().decode())
print("ADEME total:", d.get("total"))
if d.get("results"):
    print("ADEME exemple:", d["results"][0].get("email"), d["results"][0].get("telephone"))

# Test 2 - PagesJaunes
url2 = "https://www.pagesjaunes.fr/annuaire/chercherlespros?quoi=BERNARD+DEBOEUF&ou=01120"
req2 = urllib.request.Request(url2, headers={
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept-Language": "fr-FR,fr;q=0.9",
    "Accept": "text/html",
})
with urllib.request.urlopen(req2, timeout=12) as r:
    html = r.read(80000).decode("utf-8", errors="replace")

emails = re.findall(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,6}", html)
tels = re.findall(r"(?:0[1-9])(?:[\s.\-]?\d{2}){4}", html)
print("PJ emails:", emails[:5])
print("PJ tels:", tels[:5])
print("PJ html len:", len(html))
# Cherche si ya un lien vers un site pro
site_matches = re.findall(r'https?://(?!www\.pagesjaunes)[a-zA-Z0-9\-\.]{4,40}\.[a-z]{2,5}', html)
print("PJ sites:", site_matches[:5])
