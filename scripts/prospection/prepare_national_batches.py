"""
Découpe prospects_france_final.csv en batches journaliers de 280 emails.
Exclut les emails déjà envoyés (envois_log.csv).
Crée : scripts/prospection/national_batches/batch_XXXX.csv
"""

import csv
import os
import math

PROSPECTS_FILE = "scripts/prospection/prospects_france_final.csv"
LOG_FILE       = "scripts/prospection/envois_log.csv"
OUTPUT_DIR     = "scripts/prospection/national_batches"
BATCH_SIZE     = 280

os.makedirs(OUTPUT_DIR, exist_ok=True)

# --- Emails déjà envoyés ---
sent = set()
try:
    with open(LOG_FILE, encoding="utf-8") as f:
        for row in csv.DictReader(f):
            if row["statut"] == "OK":
                sent.add(row["email"].strip().lower())
except FileNotFoundError:
    pass
print(f"Emails déjà envoyés : {len(sent)}")

# --- Chargement prospects avec email ---
with open(PROSPECTS_FILE, encoding="utf-8-sig") as f:
    all_rows = list(csv.DictReader(f))

fieldnames = list({k.lstrip('﻿'): k for k in all_rows[0].keys()}.keys()) if all_rows else []

prospects = [
    r for r in all_rows
    if r.get("email", "").strip()
    and r["email"].strip().lower() not in sent
]
print(f"Prospects restants avec email : {len(prospects)}")

# --- Découpage en batches ---
n_batches = math.ceil(len(prospects) / BATCH_SIZE)
print(f"Nombre de batches ({BATCH_SIZE}/jour) : {n_batches}")
print(f"Durée estimée : {n_batches} jours (~{n_batches/5:.0f} semaines)")

for i in range(n_batches):
    chunk = prospects[i * BATCH_SIZE : (i + 1) * BATCH_SIZE]
    filename = os.path.join(OUTPUT_DIR, f"batch_{i+1:04d}.csv")
    # Normalise fieldnames (retire BOM)
    clean_fieldnames = [k.lstrip('﻿') for k in chunk[0].keys()]
    with open(filename, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=clean_fieldnames)
        writer.writeheader()
        for row in chunk:
            clean_row = {k.lstrip('﻿'): v for k, v in row.items()}
            writer.writerow(clean_row)

print(f"\nBatches créés dans : {OUTPUT_DIR}/")
print(f"  batch_0001.csv → batch_{n_batches:04d}.csv")
print(f"\nPour lancer manuellement :")
print(f"  python scripts/prospection/envoi_email_national.py --batch national_batches/batch_0001.csv")
