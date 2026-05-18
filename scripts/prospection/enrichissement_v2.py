"""
enrichissement_v2.py — Passe 2 rapide
1. Extrait tous les codes postaux du CSV
2. Pre-charge ADEME en bulk (1 requete par tranche de CP)
3. Matching en memoire : fuzzy nom + SIREN
4. Scraping site web pour ceux qui ont deja un site
Pas de societe.com (trop lent, numeros greffe inutiles)
"""

import argparse, csv, re, time, sys, urllib.request, urllib.parse, json

EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,6}")
TEL_RE   = re.compile(r"(?:0[1-9])(?:[\s.\-]?\d{2}){4}")

EMAIL_BLACKLIST = {
    "example.com","test.com","noreply","no-reply","wordpress.com","wixsite.com",
    "jimdo.com","domain.com","sentry.io","googleapis.com","schema.org","w3.org",
    "facebook.com","twitter.com","instagram.com","linkedin.com","youtube.com",
    "google.com","apple.com","microsoft.com","bing.com","duckduckgo.com","cloudflare.com",
}

ADEME_API = "https://data.ademe.fr/data-fair/api/v1/datasets/liste-des-entreprises-rge-2/lines"

CONTACT_PATHS = ["", "/contact", "/contact.html", "/nous-contacter", "/mentions-legales"]


def fetch(url, timeout=6):
    try:
        req = urllib.request.Request(url, headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
            "Accept": "text/html,*/*;q=0.8",
            "Accept-Language": "fr-FR,fr;q=0.9",
            "Accept-Encoding": "identity",
        })
        with urllib.request.urlopen(req, timeout=timeout) as r:
            raw = r.read(80000)
            return raw.decode(r.headers.get_content_charset() or "utf-8", errors="replace")
    except Exception:
        return ""


def valid_email(e):
    e = e.lower()
    domain = e.split("@")[-1]
    if any(bl in domain for bl in EMAIL_BLACKLIST):
        return False
    return domain.endswith((".fr",".com",".net",".org",".eu",".biz",".pro"))


def extract_emails(html):
    return [e.lower() for e in EMAIL_RE.findall(html) if valid_email(e)]


def normalize(s):
    s = re.sub(r'\b(SAS|SARL|EURL|EI|SA|SNC|SASU|AUTO|MICRO|SOCIETE|ENTREPRISE|GROUPE|ET|LES|LE|LA|DE|DU|DES)\b', '', s.upper())
    s = re.sub(r'[^A-Z0-9\s]', '', s)
    return re.sub(r'\s+', ' ', s).strip()


# ---------------------------------------------------------------------------
# Pre-chargement ADEME en bulk
# ---------------------------------------------------------------------------

def load_ademe_bulk(code_postaux):
    """
    Charge ADEME pour une liste de CPs en faisant des requetes par prefixe dep.
    Retourne un index { siren: {email, tel, site}, nom_norm: {email, tel, site} }
    """
    # Regrouper par departement (2 premiers chars du CP)
    depts = sorted(set(cp[:2] for cp in code_postaux if cp and len(cp) >= 2))
    index = {}
    total_loaded = 0

    print(f"  Pre-chargement ADEME pour {len(depts)} departements...", flush=True)

    for dept in depts:
        # Requete avec filtre sur code_postal commencant par le dept
        params = {
            "qs": f'code_postal:{dept}*',
            "size": 10000,
        }
        url = ADEME_API + "?" + urllib.parse.urlencode(params)
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "ChantierDevis/1.0"})
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read().decode())
        except Exception as e:
            print(f"  [ADEME] dept={dept} erreur: {e}", flush=True)
            continue

        results = data.get("results", [])
        for r in results:
            email  = (r.get("email") or "").strip().lower()
            tel    = (r.get("telephone") or "").strip()
            site   = (r.get("site_internet") or "").strip()
            siret  = (r.get("siret") or "").strip()
            nom    = (r.get("nom_entreprise") or "").strip()
            siren  = siret[:9] if len(siret) >= 9 else ""

            if not (email or tel):
                continue

            entry = {"email": email, "telephone": tel, "site_web": site}

            # Index par SIREN
            if siren:
                existing = index.get(siren, {})
                if not existing.get("email") or email:
                    index[siren] = entry

            # Index par nom normalise
            nom_norm = normalize(nom)
            if nom_norm and len(nom_norm) > 3:
                existing = index.get(nom_norm, {})
                if not existing.get("email") or email:
                    index[nom_norm] = entry

            total_loaded += 1

        print(f"  dept={dept}: {len(results)} RGE charges | index total: {len(index)}", flush=True)
        time.sleep(0.3)

    print(f"  ADEME pre-charge: {total_loaded} entrees, {len(index)} cles d index\n", flush=True)
    return index


def ademe_match(index, nom, siren):
    """Cherche dans l index ADEME pre-charge."""
    # Match SIREN exact
    if siren and siren in index:
        return index[siren]

    # Match nom normalise exact
    nom_norm = normalize(nom)
    if nom_norm in index:
        return index[nom_norm]

    # Match partiel : mots cles du nom (min 5 chars)
    mots = [m for m in nom_norm.split() if len(m) >= 5]
    for mot in mots:
        for cle, val in index.items():
            if mot in cle and (val.get("email") or val.get("telephone")):
                return val

    return {}


# ---------------------------------------------------------------------------
# Scraping site web
# ---------------------------------------------------------------------------

def scrape_email(site_url):
    if not site_url or not site_url.startswith("http"):
        return {}
    domain = re.sub(r'^https?://(www\.)?', '', site_url).split('/')[0]
    base = f"https://{domain}"
    result = {}
    for path in CONTACT_PATHS[:4]:
        html = fetch(base + path, timeout=5)
        if not html:
            continue
        emails = extract_emails(html)
        tels = TEL_RE.findall(html)
        if emails:
            pref = [e for e in emails if domain.split('.')[0] in e]
            result["email"] = pref[0] if pref else emails[0]
        if tels and not result.get("telephone"):
            result["telephone"] = re.sub(r"[\s.\-]","",tels[0])
        if result.get("email"):
            break
        if path:
            time.sleep(0.15)
    return result


# ---------------------------------------------------------------------------
# Pipeline
# ---------------------------------------------------------------------------

def enrich_v2(input_file, output_file):
    rows = []
    with open(input_file, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames or []
        rows = list(reader)

    targets = [(i, r) for i, r in enumerate(rows) if not r.get("email")]
    print(f"Total: {len(rows)} | Sans email: {len(targets)}", flush=True)

    # Extraire les CPs uniques des cibles
    cps = list(set(r.get("code_postal","") for _, r in targets if r.get("code_postal")))
    print(f"Codes postaux uniques: {len(cps)}", flush=True)

    # Pre-charger ADEME en bulk
    ademe_index = load_ademe_bulk(cps)

    stats = {"ademe": 0, "site": 0, "none": 0}
    new_emails = 0

    print(f"Matching en cours...\n", flush=True)

    for count, (orig_idx, row) in enumerate(targets, 1):
        nom   = row.get("nom_entreprise", "").strip()
        siren = row.get("siren", "").strip()
        site  = row.get("site_web", "").strip()
        pct   = count * 100 // len(targets)
        prefix = f"[{count}/{len(targets)} {pct}%] {nom[:38]:38}"

        # ADEME match
        match = ademe_match(ademe_index, nom, siren)
        if match.get("email") and valid_email(match["email"]):
            rows[orig_idx]["email"] = match["email"]
            if match.get("telephone") and not rows[orig_idx].get("telephone"):
                rows[orig_idx]["telephone"] = match["telephone"]
            if match.get("site_web") and not site:
                rows[orig_idx]["site_web"] = match["site_web"]
                site = rows[orig_idx]["site_web"]
            stats["ademe"] += 1
            new_emails += 1
            print(f"{prefix} [ADEME] {match['email']}", flush=True)
            continue

        # Scraping site si disponible
        if site:
            ws = scrape_email(site)
            if ws.get("email"):
                rows[orig_idx]["email"] = ws["email"]
                if ws.get("telephone") and not rows[orig_idx].get("telephone"):
                    rows[orig_idx]["telephone"] = ws["telephone"]
                stats["site"] += 1
                new_emails += 1
                print(f"{prefix} [SITE] {ws['email']}", flush=True)
                time.sleep(0.2)
                continue

        stats["none"] += 1
        if count % 100 == 0:
            print(f"{prefix} [-] {count}/{len(targets)}", flush=True)

    # Sauvegarde
    with open(output_file, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    with_email = sum(1 for r in rows if r.get("email"))
    with_tel   = sum(1 for r in rows if r.get("telephone"))
    total = len(rows)

    print(f"\n{'='*55}", flush=True)
    print(f"PASSE 2 TERMINEE", flush=True)
    print(f"  Nouveaux emails    : {new_emails}", flush=True)
    print(f"  TOTAL emails       : {with_email} ({with_email*100//total if total else 0}%)", flush=True)
    print(f"  TOTAL telephones   : {with_tel} ({with_tel*100//total if total else 0}%)", flush=True)
    print(f"  Via ADEME (bulk)   : {stats['ademe']}", flush=True)
    print(f"  Via site web       : {stats['site']}", flush=True)
    print(f"  Non trouves        : {stats['none']}", flush=True)
    print(f"\nFichier : {output_file}", flush=True)
    print(f"Etape suivante : python export.py --input {output_file}", flush=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input",  default="prospects_enrichis.csv")
    parser.add_argument("--output", default="prospects_enrichis_v2.csv")
    args = parser.parse_args()
    enrich_v2(args.input, args.output)


if __name__ == "__main__":
    main()
