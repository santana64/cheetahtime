"""
envoi_national.py — Campagne nationale ChantierDevis
Envoie le prochain batch non-termine depuis national_batches/

Usage :
  python envoi_national.py             # Envoi reel (280 emails max)
  python envoi_national.py --dry-run   # Apercu sans envoyer
  python envoi_national.py --status    # Voir la progression globale

Le script detecte automatiquement le prochain batch a envoyer,
en excluant les emails deja dans envois_log.csv.
"""

import csv, os, sys, subprocess

BASE_DIR    = os.path.dirname(os.path.abspath(__file__))
BATCHES_DIR = os.path.join(BASE_DIR, "national_batches")
LOG_FILE    = os.path.join(BASE_DIR, "envois_log.csv")
SENDER      = os.path.join(BASE_DIR, "envoi_email.py")

def load_sent():
    sent = set()
    if not os.path.exists(LOG_FILE):
        return sent
    with open(LOG_FILE, newline="", encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            if row.get("statut") == "OK":
                sent.add(row["email"].strip().lower())
    return sent

def count_today():
    from datetime import datetime
    today = datetime.today().strftime("%Y-%m-%d")
    if not os.path.exists(LOG_FILE):
        return 0
    count = 0
    with open(LOG_FILE, newline="", encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            if row.get("statut") == "OK" and row.get("date", "").startswith(today):
                count += 1
    return count

def find_next_batch(sent):
    """Trouve le premier batch ayant encore des emails non envoyes."""
    batches = sorted(f for f in os.listdir(BATCHES_DIR) if f.endswith(".csv"))
    for batch_file in batches:
        path = os.path.join(BATCHES_DIR, batch_file)
        with open(path, newline="", encoding="utf-8-sig") as f:
            rows = list(csv.DictReader(f))
        remaining = [r for r in rows if r.get("email", "").strip().lower() not in sent]
        if remaining:
            return batch_file, len(rows), len(remaining)
    return None, 0, 0

def show_status():
    sent = load_sent()
    batches = sorted(f for f in os.listdir(BATCHES_DIR) if f.endswith(".csv"))
    total_prospects = 0
    total_remaining = 0
    completed = 0
    current_batch = None

    for batch_file in batches:
        path = os.path.join(BATCHES_DIR, batch_file)
        with open(path, newline="", encoding="utf-8-sig") as f:
            rows = list(csv.DictReader(f))
        remaining = [r for r in rows if r.get("email", "").strip().lower() not in sent]
        total_prospects += len(rows)
        total_remaining += len(remaining)
        if len(remaining) == 0:
            completed += 1
        elif current_batch is None:
            current_batch = (batch_file, len(remaining))

    sent_count = total_prospects - total_remaining
    pct = sent_count / total_prospects * 100 if total_prospects else 0
    today = count_today()

    print("=" * 55)
    print("CAMPAGNE NATIONALE ChantierDevis")
    print("=" * 55)
    print(f"  Total prospects  : {total_prospects:>6,}")
    print(f"  Envoyes          : {sent_count:>6,}  ({pct:.1f}%)")
    print(f"  Restants         : {total_remaining:>6,}")
    print(f"  Batches termines : {completed:>6} / {len(batches)}")
    print(f"  Envoyes auj.     : {today:>6} / 280")
    if current_batch:
        print(f"  Prochain batch   : {current_batch[0]} ({current_batch[1]} restants)")
    else:
        print("  CAMPAGNE TERMINEE !")
    from datetime import datetime, timedelta
    if total_remaining > 0:
        days_left = (total_remaining - today) // 280 + 1
        end_date = datetime.today() + timedelta(days=days_left)
        print(f"  Fin estimee      : {end_date.strftime('%d/%m/%Y')} (~{days_left} jours)")
    print("=" * 55)


def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--status",  action="store_true")
    args = parser.parse_args()

    if args.status:
        show_status()
        return

    sent = load_sent()
    today_count = count_today()

    if today_count >= 280:
        print(f"Limite journaliere atteinte ({today_count}/280). Rien a faire aujourd'hui.")
        show_status()
        return

    batch_file, total, remaining = find_next_batch(sent)
    if not batch_file:
        print("Tous les batches sont termines ! Campagne nationale complete.")
        show_status()
        return

    batch_path = os.path.join(BATCHES_DIR, batch_file)
    print(f"Batch selectionne : {batch_file} ({remaining} restants)")
    print(f"Envoyes auj. avant lancement : {today_count}/280")
    print()

    cmd = [
        sys.executable,
        SENDER,
        "--input", batch_path,
        "--personalize",
    ]
    if args.dry_run:
        cmd.append("--dry-run")

    subprocess.run(cmd)

    print()
    show_status()


if __name__ == "__main__":
    main()
