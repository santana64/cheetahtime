"""
export.py — Déduplique, trie et exporte la liste finale prête à l'envoi
Produit :
  - prospects_final.csv  : tous les prospects triés par priorité
  - prospects_email.csv  : uniquement ceux avec email (prêts campagne)
  - stats.txt            : résumé statistique

Usage : python export.py [--input prospects_enrichis.csv]
"""

import argparse
import csv
import sys
from collections import defaultdict
from datetime import datetime


# ---------------------------------------------------------------------------
# Chargement et nettoyage
# ---------------------------------------------------------------------------

def load_csv(path: str) -> tuple[list, list]:
    with open(path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames or []
        rows = list(reader)
    return rows, fieldnames


def deduplicate(rows: list) -> list:
    seen_email = set()
    seen_siret = set()
    clean = []
    dupes = 0

    for row in rows:
        siret = row.get("siret", "").strip()
        email = row.get("email", "").strip().lower()

        if siret and siret in seen_siret:
            dupes += 1
            continue
        if email and email in seen_email:
            dupes += 1
            continue

        if siret:
            seen_siret.add(siret)
        if email:
            seen_email.add(email)
        clean.append(row)

    print(f"  Doublons supprimés : {dupes}")
    return clean


def sort_rows(rows: list) -> list:
    priority_order = {"P0": 0, "P1": 1, "P2": 2, "": 3}
    return sorted(rows, key=lambda r: (
        priority_order.get(r.get("priorite", ""), 3),
        bool(r.get("email")),
        r.get("departement", ""),
    ), reverse=False)


# ---------------------------------------------------------------------------
# Export
# ---------------------------------------------------------------------------

def write_csv(rows: list, fieldnames: list, path: str):
    with open(path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    print(f"  Ecrit : {path} ({len(rows)} lignes)")


def write_stats(rows: list, path: str):
    total = len(rows)
    with_email = sum(1 for r in rows if r.get("email"))
    with_site = sum(1 for r in rows if r.get("site_web"))
    p0 = sum(1 for r in rows if r.get("priorite") == "P0")
    p1 = sum(1 for r in rows if r.get("priorite") == "P1")
    p2 = sum(1 for r in rows if r.get("priorite") == "P2")

    # Par département
    by_dept = defaultdict(int)
    for r in rows:
        by_dept[r.get("departement", "?")] += 1

    # Par NAF
    by_naf = defaultdict(int)
    for r in rows:
        by_naf[r.get("naf_code", "?")] += 1

    lines = [
        f"=== Rapport ChantierDevis Prospection ===",
        f"Généré le : {datetime.today().strftime('%Y-%m-%d %H:%M')}",
        f"",
        f"TOTAL PROSPECTS         : {total}",
        f"Avec email              : {with_email} ({with_email*100//total if total else 0}%)",
        f"Avec site web           : {with_site}",
        f"",
        f"PRIORITÉ",
        f"  P0 (site + email)     : {p0}",
        f"  P1 (adresse complète) : {p1}",
        f"  P2 (données partielle): {p2}",
        f"",
        f"TOP 10 DÉPARTEMENTS",
    ]

    top_depts = sorted(by_dept.items(), key=lambda x: -x[1])[:10]
    for dept, count in top_depts:
        lines.append(f"  {dept:>4} : {count}")

    lines += ["", "RÉPARTITION PAR MÉTIER (NAF)"]
    top_naf = sorted(by_naf.items(), key=lambda x: -x[1])[:15]
    for naf, count in top_naf:
        lines.append(f"  {naf:>8} : {count}")

    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    print(f"  Stats : {path}")
    print()
    print("\n".join(lines))


# ---------------------------------------------------------------------------
# Pipeline principal
# ---------------------------------------------------------------------------

def run(input_file: str, output_final: str, output_email: str, stats_file: str):
    print(f"Chargement : {input_file}")
    rows, fieldnames = load_csv(input_file)
    print(f"  {len(rows)} lignes chargées")

    print("Déduplification...")
    rows = deduplicate(rows)

    print("Tri par priorité...")
    rows = sort_rows(rows)

    print("Export...")
    write_csv(rows, fieldnames, output_final)

    email_rows = [r for r in rows if r.get("email")]
    write_csv(email_rows, fieldnames, output_email)

    write_stats(rows, stats_file)

    print(f"\nPipeline complet.")
    print(f"Prêts pour campagne email : {len(email_rows)} prospects dans {output_email}")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Export final liste prospection BTP")
    parser.add_argument("--input", default="prospects_enrichis.csv")
    parser.add_argument("--output-final", default="prospects_final.csv")
    parser.add_argument("--output-email", default="prospects_email.csv")
    parser.add_argument("--stats", default="stats.txt")
    args = parser.parse_args()

    run(args.input, args.output_final, args.output_email, args.stats)


if __name__ == "__main__":
    main()
