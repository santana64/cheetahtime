"""
segmentation.py — Filtre et segmente les prospects pour ChantierDevis
Cibles : petites structures (EI, SARL, SAS/SASU) avec 0-9 salaries
Produit :
  - prospects_cibles.csv   : tous les prospects cibles avec email
  - batch_500.csv          : 1er batch test, equilibre par metier
  - stats_cibles.txt       : resume
"""

import csv, sys, random
from collections import defaultdict
from datetime import datetime

INPUT  = "prospects_france_final.csv"
OUTPUT_CIBLES = "prospects_cibles.csv"
OUTPUT_BATCH  = "batch_500.csv"
OUTPUT_STATS  = "stats_cibles.txt"

# Petites structures
NJ_CIBLES = {
    "1000",  # Entrepreneur individuel (EI / micro)
    "5499",  # SARL
    "5710",  # SAS / SASU
    "5458",  # EURL
    "5599",  # SARL unipersonnelle variantes
    "5453",  # SARL cooperative
    "5410",  # SA simplifiee
    "3120",  # SNC
}

# 0-9 salaries (NN = non-employeur = micro/auto-entrepreneur)
EFFECTIF_CIBLES = {"NN", "00", "01", "02", "03"}

NAF_LABELS = {
    "43.34Z": "Peinture",
    "43.31Z": "Platrerie",
    "43.32A": "Menuiserie bois",
    "43.32B": "Menuiserie metallique",
    "43.33Z": "Carrelage/parquet",
    "43.39Z": "Finition",
    "43.21A": "Electricite",
    "43.22A": "Plomberie",
    "43.22B": "Chauffage/clim",
    "43.29A": "Isolation",
    "43.29B": "Autres installations",
    "43.91A": "Charpente",
    "43.91B": "Couverture",
    "43.99C": "Maconnerie",
    "43.99A": "Etancheite",
    "43.99D": "Travaux specialises",
    "41.20A": "Construction maisons",
    "41.20B": "Construction batiments",
}


def score(row):
    """Plus le score est haut, meilleur est le prospect."""
    s = 0
    if row.get("email"):      s += 10
    if row.get("telephone"):  s += 5
    if row.get("site_web"):   s += 3
    if row.get("nom_dirigeant"): s += 2
    if row.get("adresse"):    s += 1
    return s


def main():
    print("Chargement...", flush=True)
    with open(INPUT, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames or []
        rows = list(reader)
    print(f"  {len(rows)} lignes", flush=True)

    # --- Filtre structure + taille ---
    cibles = []
    for r in rows:
        nj = r.get("nature_juridique", "").strip()
        eff = r.get("effectif", "").strip()
        email = r.get("email", "").strip()

        if nj not in NJ_CIBLES:
            continue
        # Si effectif renseigne, exclure les grandes structures
        if eff and eff not in EFFECTIF_CIBLES:
            continue
        if not email:
            continue
        cibles.append(r)

    print(f"  Apres filtres (structure + taille + email) : {len(cibles)}", flush=True)

    # --- Score et tri ---
    cibles.sort(key=score, reverse=True)

    # --- Export prospects_cibles.csv ---
    with open(OUTPUT_CIBLES, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(cibles)
    print(f"  Ecrit : {OUTPUT_CIBLES} ({len(cibles)} lignes)", flush=True)

    # --- Batch 500 equilibre par metier ---
    # Repartir 500 proportionnellement aux 18 metiers
    by_naf = defaultdict(list)
    for r in cibles:
        by_naf[r.get("naf_code", "?")].append(r)

    total = len(cibles)
    batch = []
    for naf, group in by_naf.items():
        quota = max(1, round(500 * len(group) / total))
        # Prendre les mieux scores (deja tries)
        batch.extend(group[:quota])

    # Ajuster a exactement 500
    batch.sort(key=score, reverse=True)
    batch = batch[:500]

    with open(OUTPUT_BATCH, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(batch)
    print(f"  Ecrit : {OUTPUT_BATCH} ({len(batch)} lignes)", flush=True)

    # --- Stats ---
    with_tel   = sum(1 for r in cibles if r.get("telephone"))
    with_site  = sum(1 for r in cibles if r.get("site_web"))
    by_naf_cnt = defaultdict(int)
    by_dept_cnt = defaultdict(int)
    by_nj_cnt  = defaultdict(int)
    for r in cibles:
        by_naf_cnt[r.get("naf_code","?")] += 1
        by_dept_cnt[r.get("departement","?")] += 1
        by_nj_cnt[r.get("nature_juridique","?")] += 1

    lines = [
        "=== Segmentation ChantierDevis ===",
        f"Genere le : {datetime.today().strftime('%Y-%m-%d %H:%M')}",
        "",
        f"TOTAL CIBLES (email + petite structure) : {len(cibles)}",
        f"  Avec telephone                        : {with_tel} ({with_tel*100//len(cibles) if cibles else 0}%)",
        f"  Avec site web                         : {with_site} ({with_site*100//len(cibles) if cibles else 0}%)",
        f"  Email + telephone                     : {sum(1 for r in cibles if r.get('email') and r.get('telephone'))}",
        "",
        "STRUCTURE JURIDIQUE",
    ]
    nj_labels = {"1000":"EI/micro","5499":"SARL","5710":"SAS/SASU","5458":"EURL","5599":"SARL var.","3120":"SNC","5453":"SARL coop","5410":"SA simplif."}
    for nj, cnt in sorted(by_nj_cnt.items(), key=lambda x: -x[1]):
        lines.append(f"  {nj_labels.get(nj, nj):20} : {cnt}")

    lines += ["", "PAR METIER"]
    for naf, cnt in sorted(by_naf_cnt.items(), key=lambda x: -x[1]):
        label = NAF_LABELS.get(naf, naf)
        lines.append(f"  {label:25} : {cnt}")

    lines += ["", "TOP 15 DEPARTEMENTS"]
    for dept, cnt in sorted(by_dept_cnt.items(), key=lambda x: -x[1])[:15]:
        lines.append(f"  {dept:>4} : {cnt}")

    lines += [
        "",
        "BATCH TEST",
        f"  batch_500.csv : {len(batch)} prospects (equilibre par metier)",
        "  Conseil : envoyer ce batch en premier, mesurer open rate avant",
        "  la liste complete.",
        "",
        "NOTE MOBILE",
        "  Les telephones sont des fixes professionnels (source ADEME RGE).",
        "  Pour des mobiles : enrichir manuellement les top prospects via",
        "  LinkedIn ou Pages Jaunes — les 50 premiers suffisent pour un test.",
    ]

    with open(OUTPUT_STATS, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    print()
    print("\n".join(lines))


if __name__ == "__main__":
    main()
