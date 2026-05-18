"""
collecte.py — Extraction artisans BTP depuis l'API Recherche Entreprises (data.gouv.fr)
Aucune cle API requise. Donnees publiques INSEE/Sirene.
Usage : python collecte.py [--dept 01,06,75] [--limit 1500] [--output prospects.csv]
"""

import argparse
import csv
import time
import sys
from datetime import datetime
import urllib.request
import urllib.parse
import json

API_BASE = "https://recherche-entreprises.api.gouv.fr/search"

NAF_CODES = [
    "43.34Z",  # Peinture et vitrerie
    "43.31Z",  # Platrerie
    "43.32A",  # Menuiserie bois et PVC
    "43.32B",  # Menuiserie metallique et serrurerie
    "43.33Z",  # Carrelage et parquets
    "43.39Z",  # Autres travaux de finition
    "43.21A",  # Electricite tous locaux
    "43.22A",  # Plomberie eau et gaz
    "43.22B",  # Chauffage et climatisation
    "43.29A",  # Isolation
    "43.29B",  # Autres installations
    "43.91A",  # Charpente
    "43.91B",  # Couverture
    "43.99C",  # Maconnerie generale et gros oeuvre
    "43.99A",  # Etancheification
    "43.99D",  # Autres travaux specialises
    "41.20A",  # Construction maisons individuelles
    "41.20B",  # Construction batiments residentiels
]

ALL_DEPTS = [
    "01","02","03","04","05","06","07","08","09","10",
    "11","12","13","14","15","16","17","18","19","21",
    "22","23","24","25","26","27","28","29","2A","2B",
    "30","31","32","33","34","35","36","37","38","39",
    "40","41","42","43","44","45","46","47","48","49",
    "50","51","52","53","54","55","56","57","58","59",
    "60","61","62","63","64","65","66","67","68","69",
    "70","71","72","73","74","75","76","77","78","79",
    "80","81","82","83","84","85","86","87","88","89",
    "90","91","92","93","94","95",
    "971","972","973","974","976",
]

CSV_FIELDS = [
    "siret","siren","nom_entreprise","nom_dirigeant",
    "naf_code","naf_libelle","adresse","code_postal",
    "ville","departement","site_web","email",
    "telephone","effectif","date_creation",
    "nature_juridique","priorite","source","date_collecte",
]


def api_get(params, retries=3):
    url = API_BASE + "?" + urllib.parse.urlencode(params)
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "ChantierDevis/1.0"})
            with urllib.request.urlopen(req, timeout=15) as resp:
                return json.loads(resp.read().decode())
        except Exception as e:
            if attempt < retries - 1:
                time.sleep(2 ** attempt)
            else:
                print(f"  [ERR] {e}", file=sys.stderr)
                return {}
    return {}


def get_site_web(result):
    """Cherche un site web dans matching_etablissements ou liste_rge."""
    for etab in result.get("matching_etablissements", []):
        url = etab.get("url") or etab.get("url_siege")
        if url:
            return url.strip()
    siege = result.get("siege", {})
    # Parfois dans liste_rge il y a des URLs
    for rge in siege.get("liste_rge") or []:
        if isinstance(rge, str) and rge.startswith("http"):
            return rge
    return ""


def get_dirigeant(result):
    for d in result.get("dirigeants", []):
        if d.get("type_dirigeant") == "personne physique":
            prenom = d.get("prenom") or ""
            nom = d.get("nom") or ""
            return f"{prenom} {nom}".strip()
    # Personne morale en fallback
    for d in result.get("dirigeants", []):
        denom = d.get("denomination") or ""
        if denom:
            return denom
    return ""


def parse_result(result, dept, naf):
    siege = result.get("siege", {})

    nom = (
        result.get("nom_complet")
        or result.get("nom_raison_sociale")
        or ""
    )

    adresse = siege.get("adresse", "") or ""
    code_postal = siege.get("code_postal", "") or ""
    ville = siege.get("libelle_commune", "") or ""
    dept_reel = siege.get("departement", dept)
    siret = siege.get("siret", "") or ""
    siren = result.get("siren", "") or ""
    effectif = result.get("tranche_effectif_salarie", "") or ""
    date_creation = result.get("date_creation", "") or ""
    nature_juridique = result.get("nature_juridique", "") or ""
    site_web = get_site_web(result)
    dirigeant = get_dirigeant(result)

    # Libelle NAF depuis l'objet siege
    naf_libelle = siege.get("activite_principale", naf)

    row = {
        "siret": siret,
        "siren": siren,
        "nom_entreprise": nom,
        "nom_dirigeant": dirigeant,
        "naf_code": naf,
        "naf_libelle": naf_libelle,
        "adresse": adresse,
        "code_postal": code_postal,
        "ville": ville,
        "departement": dept_reel,
        "site_web": site_web,
        "email": "",
        "telephone": "",
        "effectif": effectif,
        "date_creation": date_creation,
        "nature_juridique": nature_juridique,
        "source": "API Recherche Entreprises / INSEE Sirene",
        "date_collecte": datetime.today().strftime("%Y-%m-%d"),
    }

    # Priorite
    if site_web and code_postal:
        row["priorite"] = "P0"
    elif code_postal and ville:
        row["priorite"] = "P1"
    else:
        row["priorite"] = "P2"

    return row


def collect(depts, limit, output):
    seen_sirens = set()
    results = []
    total_requests = 0

    print(f"Demarrage collecte - {len(depts)} depts x {len(NAF_CODES)} NAF")
    print(f"Objectif : {limit} prospects | Sortie : {output}")
    sys.stdout.flush()

    with open(output, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_FIELDS)
        writer.writeheader()
        f.flush()

        for dept in depts:
            if len(results) >= limit:
                break

            for naf in NAF_CODES:
                if len(results) >= limit:
                    break

                page = 1
                while len(results) < limit:
                    params = {
                        "activite_principale": naf,
                        "departement": dept,
                        "page": page,
                        "per_page": 25,
                    }

                    data = api_get(params)
                    total_requests += 1
                    items = data.get("results", [])

                    if not items:
                        break

                    new_in_page = 0
                    for item in items:
                        siren = item.get("siren", "")
                        if not siren or siren in seen_sirens:
                            continue
                        seen_sirens.add(siren)

                        row = parse_result(item, dept, naf)
                        results.append(row)
                        writer.writerow(row)
                        new_in_page += 1

                    f.flush()

                    total_pages = data.get("total_pages", 1)
                    print(f"  dept={dept} naf={naf} page={page}/{total_pages} -> {len(results)} total")
                    sys.stdout.flush()

                    if page >= total_pages or page >= 10:
                        break
                    page += 1
                    time.sleep(0.3)

    print(f"\nCollecte terminee : {len(results)} prospects uniques")
    print(f"Requetes API : {total_requests}")
    print(f"Fichier : {output}")

    p0 = sum(1 for r in results if r["priorite"] == "P0")
    p1 = sum(1 for r in results if r["priorite"] == "P1")
    p2 = sum(1 for r in results if r["priorite"] == "P2")
    print(f"P0 (site web) : {p0} | P1 : {p1} | P2 : {p2}")
    print(f"Etape suivante : python enrichissement.py --input {output}")
    sys.stdout.flush()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dept", default="ALL")
    parser.add_argument("--limit", type=int, default=1500)
    parser.add_argument("--output", default="prospects_brut.csv")
    args = parser.parse_args()

    depts = ALL_DEPTS if args.dept == "ALL" else [d.strip() for d in args.dept.split(",")]
    collect(depts, args.limit, args.output)


if __name__ == "__main__":
    main()
