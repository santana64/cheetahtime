"""
sync_brevo_stats.py — Synchronise les evenements Brevo dans prospects_db.json

Marque status = "clicked" pour les prospects qui ont clique sur un lien.
Marque status = "opened" pour ceux qui ont ouvert sans cliquer.

Usage :
  python sync_brevo_stats.py              # Sync des 30 derniers jours
  python sync_brevo_stats.py --days 7     # Sync des 7 derniers jours
  python sync_brevo_stats.py --report     # Affiche un resume
"""

import json, os, sys, urllib.request, urllib.error, argparse
from datetime import datetime, timedelta

BREVO_API_KEY   = "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"
PROSPECT_DB_FILE = "prospects_db.json"

def load_db():
    if os.path.exists(PROSPECT_DB_FILE):
        with open(PROSPECT_DB_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}

def save_db(db):
    with open(PROSPECT_DB_FILE, "w", encoding="utf-8") as f:
        json.dump(db, f, ensure_ascii=False, indent=2)

def fetch_brevo_events(event_type, start_date, end_date, offset=0, limit=500):
    """Recupere les evenements transactionnels Brevo."""
    url = (
        f"https://api.brevo.com/v3/smtp/statistics/events"
        f"?event={event_type}&startDate={start_date}&endDate={end_date}"
        f"&limit={limit}&offset={offset}"
    )
    req = urllib.request.Request(
        url,
        headers={
            "api-key": BREVO_API_KEY,
            "Accept": "application/json",
        }
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        print(f"HTTP {e.code}: {e.read().decode()}", file=sys.stderr)
        return None
    except Exception as e:
        print(f"Erreur: {e}", file=sys.stderr)
        return None

def get_all_events(event_type, start_date, end_date):
    """Pagine et retourne tous les emails ayant eu cet evenement."""
    emails = set()
    offset = 0
    while True:
        data = fetch_brevo_events(event_type, start_date, end_date, offset=offset)
        if not data or "events" not in data:
            break
        events = data["events"]
        for ev in events:
            email = ev.get("email", "").strip().lower()
            if email:
                emails.add(email)
        if len(events) < 500:
            break
        offset += 500
    return emails

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--days",   type=int, default=30, help="Nombre de jours a synchroniser")
    parser.add_argument("--report", action="store_true",  help="Affiche un resume sans modifier la DB")
    args = parser.parse_args()

    end_date   = datetime.today().strftime("%Y-%m-%d")
    start_date = (datetime.today() - timedelta(days=args.days)).strftime("%Y-%m-%d")

    print(f"Sync Brevo : {start_date} -> {end_date}")

    print("  Recuperation des clics...")
    clicked_emails = get_all_events("clicks", start_date, end_date)
    print(f"  -> {len(clicked_emails)} emails avec clic")

    print("  Recuperation des ouvertures...")
    opened_emails = get_all_events("opened", start_date, end_date)
    print(f"  -> {len(opened_emails)} emails avec ouverture")

    print("  Recuperation des bounces (hard)...")
    bounced_emails = get_all_events("hardBounces", start_date, end_date)
    print(f"  -> {len(bounced_emails)} emails en bounce dur")

    db = load_db()
    if not db:
        print("prospects_db.json vide ou absent — rien a mettre a jour.")
        return

    updated_clicked = 0
    updated_opened  = 0
    updated_bounced = 0
    total = len(db)

    for email, data in db.items():
        current_status = data.get("status", "j0_sent")
        # Ne pas degrader un statut avance
        if current_status in {"converted", "unsubscribed", "j10_sent"}:
            continue

        if email in bounced_emails:
            if current_status != "bounced":
                if not args.report:
                    db[email]["status"] = "bounced"
                updated_bounced += 1
        elif email in clicked_emails:
            if current_status != "clicked":
                if not args.report:
                    db[email]["status"] = "clicked"
                updated_clicked += 1
        elif email in opened_emails:
            if current_status not in {"clicked", "opened"}:
                if not args.report:
                    db[email]["status"] = "opened"
                updated_opened += 1

    if not args.report:
        save_db(db)

    print()
    print("=" * 50)
    print("RESUME SYNC BREVO")
    print("=" * 50)
    print(f"  Prospects en DB      : {total}")
    print(f"  Nouveaux bounces     : {updated_bounced}")
    print(f"  Nouveaux cliqueurs   : {updated_clicked}")
    print(f"  Nouveaux ouvreurs    : {updated_opened}")

    # Breakdown statuts
    from collections import Counter
    statuts = Counter(d.get("status", "?") for d in db.values())
    print()
    print("  Statuts actuels :")
    for s, n in sorted(statuts.items(), key=lambda x: -x[1]):
        print(f"    {s:<20} {n:>5}")
    print("=" * 50)

    if args.report:
        print("(mode --report : aucune modification sauvegardee)")

if __name__ == "__main__":
    main()
