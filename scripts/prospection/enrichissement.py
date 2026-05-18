"""
enrichissement.py — Enrichissement email/tel artisans BTP
Sources :
  1. ADEME RGE open data  — recherche par nom, email/tel inclus
  2. DuckDuckGo           — trouve le site web, puis scrape l'email
  3. Scraping site web    — page contact / mentions legales

Usage : python enrichissement.py --input prospects_brut.csv [--output prospects_enrichis.csv]
"""

import argparse
import csv
import re
import time
import sys
import gzip
import io
import urllib.request
import urllib.parse
import json
from html.parser import HTMLParser

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,6}")
TEL_RE   = re.compile(r"(?:0[1-9])(?:[\s.\-]?\d{2}){4}")

EMAIL_BLACKLIST = {
    "example.com","test.com","noreply","no-reply","wordpress.com",
    "wixsite.com","jimdo.com","placeholder","domain.com",
    "sentry.io","googleapis.com","schema.org","w3.org","facebook.com",
    "twitter.com","instagram.com","linkedin.com","youtube.com",
    "pagesjaunes.fr","google.com","apple.com","microsoft.com",
}

CONTACT_PATHS = ["", "/contact", "/contact.html", "/contact.php",
                 "/nous-contacter", "/mentions-legales", "/devis", "/a-propos"]


def make_headers(referer=""):
    h = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/124.0.0.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.7",
        "Accept-Encoding": "gzip, deflate",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
    }
    if referer:
        h["Referer"] = referer
    return h


def fetch(url, timeout=10, referer=""):
    try:
        req = urllib.request.Request(url, headers=make_headers(referer))
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read(100_000)
            enc = resp.headers.get("Content-Encoding", "")
            if enc == "gzip":
                raw = gzip.decompress(raw)
            charset = resp.headers.get_content_charset() or "utf-8"
            return raw.decode(charset, errors="replace")
    except Exception:
        return ""


def valid_email(e):
    e = e.lower()
    domain = e.split("@")[-1]
    if any(bl in domain for bl in EMAIL_BLACKLIST):
        return False
    return domain.endswith((".fr",".com",".net",".org",".eu",".biz",".pro"))


def extract_emails(text):
    return [e.lower() for e in EMAIL_RE.findall(text) if valid_email(e)]


def extract_phones(text):
    found = set()
    for t in TEL_RE.findall(text):
        t = re.sub(r"[\s.\-]", "", t)
        found.add(t)
    return sorted(found)


def clean_domain(url):
    url = url.strip().lower()
    if not url.startswith("http"):
        url = "https://" + url
    parsed = urllib.parse.urlparse(url)
    domain = (parsed.netloc or parsed.path).replace("www.", "")
    return domain.split("/")[0]


# ---------------------------------------------------------------------------
# SOURCE 1 — ADEME RGE (recherche par nom d'entreprise)
# ---------------------------------------------------------------------------

ADEME_API = "https://data.ademe.fr/data-fair/api/v1/datasets/liste-des-entreprises-rge-2/lines"


def ademe_lookup(nom_entreprise, code_postal):
    """Cherche l'entreprise dans la base RGE ADEME par nom + CP."""
    if not nom_entreprise:
        return {}

    # Nettoyer le nom pour la recherche
    nom_clean = re.sub(r"\(.*?\)", "", nom_entreprise).strip()
    nom_clean = nom_clean[:50]

    params = {
        "q": nom_clean,
        "size": 5,
    }
    if code_postal:
        params["qs"] = f'code_postal:"{code_postal}"'

    url = ADEME_API + "?" + urllib.parse.urlencode(params)
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "ChantierDevis/1.0"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())
    except Exception:
        return {}

    for r in data.get("results", []):
        email = (r.get("email") or "").strip().lower()
        tel   = (r.get("telephone") or "").strip()
        site  = (r.get("site_internet") or "").strip()
        if email or tel:
            return {"email": email, "telephone": tel, "site_web": site}

    return {}


# ---------------------------------------------------------------------------
# SOURCE 2 — DuckDuckGo : trouver le site web de l'artisan
# ---------------------------------------------------------------------------

DDG_URL = "https://html.duckduckgo.com/html/"


def find_website_ddg(nom, ville, code_postal):
    """Cherche le site web de l'entreprise via DuckDuckGo."""
    query = f'"{nom}" {code_postal or ville} artisan'
    params = {"q": query, "kl": "fr-fr"}
    url = DDG_URL + "?" + urllib.parse.urlencode(params)
    html = fetch(url, timeout=12, referer="https://duckduckgo.com/")
    if not html:
        return ""

    # Extraire les URLs des résultats (liens externes DDG)
    urls = re.findall(
        r'href="(https?://(?!duckduckgo\.com|duck\.com)[a-zA-Z0-9\-\.]+\.[a-z]{2,5}[^"]{0,100})"',
        html
    )

    blacklist_domains = {
        "facebook.com","twitter.com","instagram.com","linkedin.com",
        "youtube.com","pagesjaunes.fr","societe.com","pappers.fr",
        "infogreffe.fr","verif.com","manageo.fr","corporama.com",
        "google.com","bing.com","wikipedia.org","leboncoin.fr",
        "pages-blanches.fr","annuaire-mairie.fr","kompass.com",
    }

    for u in urls[:8]:
        try:
            domain = clean_domain(u)
            if any(bl in domain for bl in blacklist_domains):
                continue
            # Prioriser les .fr et les URLs courtes (probablement site perso)
            if domain.endswith(".fr") or len(domain) < 30:
                return f"https://{domain}"
        except Exception:
            continue

    return ""


# ---------------------------------------------------------------------------
# SOURCE 3 — Scraping du site web
# ---------------------------------------------------------------------------

def scrape_website_email(site_url):
    """Scrape email sur site web : accueil + pages contact."""
    if not site_url:
        return {}
    domain = clean_domain(site_url)
    base = f"https://{domain}"
    result = {}

    for path in CONTACT_PATHS:
        html = fetch(base + path, timeout=8, referer=base)
        if not html:
            time.sleep(0.5)
            continue
        emails = extract_emails(html)
        phones = extract_phones(html)
        if emails:
            result["email"] = emails[0]
        if phones and not result.get("telephone"):
            result["telephone"] = phones[0]
        if result.get("email"):
            break
        if path:
            time.sleep(0.4)

    return result


# ---------------------------------------------------------------------------
# Pipeline principal
# ---------------------------------------------------------------------------

def enrich(input_file, output_file):
    rows = []
    with open(input_file, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames or []
        rows = list(reader)

    print(f"Charge : {len(rows)} prospects")
    print(f"Pipeline : ADEME RGE -> DuckDuckGo -> Scraping site web\n")
    sys.stdout.flush()

    stats = {"ademe": 0, "ddg": 0, "site": 0, "aucun": 0}

    with open(output_file, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()

        for i, row in enumerate(rows):
            nom   = row.get("nom_entreprise", "").strip()
            cp    = row.get("code_postal", "").strip()
            ville = row.get("ville", "").strip()
            site  = row.get("site_web", "").strip()

            pct = (i + 1) * 100 // len(rows)
            prefix = f"[{i+1}/{len(rows)} {pct}%] {nom[:35]:35}"

            # --- Source 1 : ADEME RGE ---
            ademe = ademe_lookup(nom, cp)
            if ademe.get("email") or ademe.get("telephone"):
                if ademe.get("email"):
                    row["email"] = ademe["email"]
                if ademe.get("telephone") and not row.get("telephone"):
                    row["telephone"] = ademe["telephone"]
                if ademe.get("site_web") and not site:
                    row["site_web"] = ademe["site_web"]
                    site = row["site_web"]
                stats["ademe"] += 1
                print(f"{prefix} [RGE] {row.get('email') or row.get('telephone','')}", flush=True)
                writer.writerow(row)
                f.flush()
                time.sleep(0.2)
                continue

            time.sleep(0.3)

            # --- Source 2 : DuckDuckGo pour trouver le site ---
            if not site:
                site = find_website_ddg(nom, ville, cp)
                if site:
                    row["site_web"] = site

            time.sleep(0.5)

            # --- Source 3 : Scraping site ---
            if site and not row.get("email"):
                ws = scrape_website_email(site)
                if ws.get("email"):
                    row["email"] = ws["email"]
                    if ws.get("telephone") and not row.get("telephone"):
                        row["telephone"] = ws["telephone"]
                    stats["site"] += 1
                    print(f"{prefix} [SITE] {row['email']}", flush=True)
                    writer.writerow(row)
                    f.flush()
                    continue

            if site and not row.get("email"):
                stats["ddg"] += 1
                print(f"{prefix} [SITE] site trouve, pas d email", flush=True)
            elif not row.get("email") and not row.get("telephone"):
                stats["aucun"] += 1
                if i % 25 == 0:
                    print(f"{prefix} [-]", flush=True)

            writer.writerow(row)
            f.flush()

    with_email = sum(1 for r in rows if r.get("email"))
    with_tel   = sum(1 for r in rows if r.get("telephone"))
    total = len(rows)

    print(f"\n{'='*55}", flush=True)
    print(f"ENRICHISSEMENT TERMINE", flush=True)
    print(f"  Total            : {total}", flush=True)
    print(f"  Avec email       : {with_email} ({with_email*100//total if total else 0}%)", flush=True)
    print(f"  Avec telephone   : {with_tel} ({with_tel*100//total if total else 0}%)", flush=True)
    print(f"  Via ADEME RGE    : {stats['ademe']}", flush=True)
    print(f"  Via scraping site: {stats['site']}", flush=True)
    print(f"  Site sans email  : {stats['ddg']}", flush=True)
    print(f"  Non trouves      : {stats['aucun']}", flush=True)
    print(f"\nFichier : {output_file}", flush=True)
    print(f"Etape suivante : python export.py --input {output_file}", flush=True)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input",  default="prospects_brut.csv")
    parser.add_argument("--output", default="prospects_enrichis.csv")
    args = parser.parse_args()
    enrich(args.input, args.output)


if __name__ == "__main__":
    main()
