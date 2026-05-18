"""
relance_j10.py — Break-up email J+10 (fermeture de dossier)

Envoie un email tres court de "fermeture de dossier" aux prospects qui :
  - ont recu le J4 il y a 6 jours ou plus (donc J0+10 total)
  - n ont pas encore recu le J10
  - n ont pas clique ni converti

Psychologie : perte imminente d acces + ton definitif = dernier sursaut de curiosite.

Usage :
  python relance_j10.py --dry-run
  python relance_j10.py
"""

import csv, json, time, sys, os, urllib.request, urllib.error, argparse
from datetime import datetime, timedelta, date

BREVO_API_KEY    = "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"
SENDER_EMAIL     = "contact@chantierdevis.fr"
SENDER_NAME      = "Noah — ChantierDevis"
REPLY_TO         = "contact@chantierdevis.fr"
PROSPECT_DB_FILE = "prospects_db.json"
LOG_FILE         = "envois_log.csv"
DAILY_LIMIT      = 280
DELAY_BETWEEN    = 2.5
J10_DELAY_DAYS   = 6  # jours apres J4 (= J0+10 au total)

UTM = "utm_source=cold&utm_medium=email&utm_campaign=relance_j10"

SKIP_STATUSES = {"clicked", "converted", "unsubscribed", "bounced", "j10_sent"}

SUBJECT = "je ferme votre dossier"

# ── Templates ────────────────────────────────────────────────────────────────

def make_html(p):
    prenom  = p.get("_prenom", "")
    nom     = p.get("nom_entreprise", "").strip().title()
    ville   = p.get("ville", "").strip().title()
    reg_url = f"https://chantierdevis.fr/register?{UTM}"
    salut   = f"Bonjour {prenom}," if prenom else "Bonjour,"

    return f"""<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Georgia,serif;font-size:16px;color:#1a1a1a;max-width:520px;margin:0 auto;padding:32px 20px;line-height:1.8">
<span style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;color:#fefefe;line-height:1px">Je ferme votre dossier ChantierDevis — l’essai gratuit reste disponible si jamais ça change.&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;</span>

<p style="margin:0 0 18px">{salut}</p>

<p style="margin:0 0 18px">
  Je suppose que les devis ne sont pas un point douloureux pour vous en ce moment
  &mdash; ou que vous avez deja trouve votre solution.
</p>

<p style="margin:0 0 18px">
  Je ferme votre dossier ChantierDevis.
  Si jamais ca change, l&#39;essai gratuit reste disponible ici&nbsp;:
  <a href="{reg_url}" style="color:#16a34a;font-weight:bold">chantierdevis.fr/register</a>.
</p>

<p style="margin:0 0 8px;font-family:Arial,sans-serif;font-size:15px">Bonne continuation,</p>
<p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:15px;font-weight:bold">Noah</p>
<p style="margin:0 0 28px;font-family:Arial,sans-serif;font-size:13px;color:#888">Fondateur · <a href="https://chantierdevis.fr" style="color:#888;text-decoration:none">chantierdevis.fr</a></p>

<hr style="border:none;border-top:1px solid #e5e5e5;margin:24px 0">
<p style="font-size:11px;color:#bbb;line-height:1.6;margin:0;font-family:Arial,sans-serif">
  {nom} · {ville}.
  <a href="mailto:{REPLY_TO}?subject=Desinscription" style="color:#bbb">Me desinscrire</a>
</p>
</body></html>"""


def make_text(p):
    prenom  = p.get("_prenom", "")
    reg_url = f"https://chantierdevis.fr/register?{UTM}"
    salut   = f"Bonjour {prenom}," if prenom else "Bonjour,"

    return f"""{salut}

Je suppose que les devis ne sont pas un point douloureux pour vous en ce moment
— ou que vous avez deja trouve votre solution.

Je ferme votre dossier ChantierDevis. Si jamais ca change, l essai gratuit
reste disponible ici : {reg_url}

Bonne continuation,
Noah — Fondateur · chantierdevis.fr

---
Pour ne plus recevoir nos emails : repondez STOP.
"""


# ── Utilitaires ───────────────────────────────────────────────────────────────

def get_prenom(nom_dirigeant):
    if not nom_dirigeant:
        return ""
    clean = nom_dirigeant.split("(")[0].strip()
    parts = clean.split()
    all_upper = all(p == p.upper() for p in parts)
    if all_upper:
        return ""
    for part in parts:
        if part != part.upper() and len(part) >= 2:
            c = part.capitalize()
            if c.upper() not in {"M", "MME", "MR", "DR", "SAS", "SARL", "EI", "SCI", "EURL"}:
                return c
    return ""

def load_db():
    if os.path.exists(PROSPECT_DB_FILE):
        with open(PROSPECT_DB_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}

def save_db(db):
    with open(PROSPECT_DB_FILE, "w", encoding="utf-8") as f:
        json.dump(db, f, ensure_ascii=False, indent=2)

def count_today():
    today = datetime.today().strftime("%Y-%m-%d")
    if not os.path.exists(LOG_FILE):
        return 0
    count = 0
    with open(LOG_FILE, newline="", encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            if row.get("statut") == "OK" and row.get("date", "").startswith(today):
                count += 1
    return count

def log_send(email, nom, statut, detail=""):
    exists = os.path.exists(LOG_FILE)
    with open(LOG_FILE, "a", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f)
        if not exists:
            w.writerow(["date", "email", "nom_entreprise", "statut", "detail"])
        w.writerow([datetime.now().strftime("%Y-%m-%d %H:%M:%S"), email, nom, statut, detail])

def send_brevo(to_email, to_name, subject, html, text):
    payload = {
        "sender":      {"name": SENDER_NAME, "email": SENDER_EMAIL},
        "to":          [{"email": to_email, "name": to_name}],
        "replyTo":     {"email": REPLY_TO},
        "subject":     subject,
        "htmlContent": html,
        "textContent": text,
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        "https://api.brevo.com/v3/smtp/email",
        data=data,
        headers={"api-key": BREVO_API_KEY, "Content-Type": "application/json", "Accept": "application/json"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return True, resp.read().decode()
    except urllib.error.HTTPError as e:
        return False, f"HTTP {e.code}: {e.read().decode()}"
    except Exception as e:
        return False, str(e)


# ── Pipeline ──────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--limit", type=int, default=0)
    args = parser.parse_args()

    db = load_db()
    if not db:
        print("prospects_db.json vide. Lancez d abord envoi_email.py puis relance_j4.py.")
        sys.exit(0)

    today    = date.today()
    cutoff   = today - timedelta(days=J10_DELAY_DAYS)
    eligible = []

    for email, data in db.items():
        if data.get("status") in SKIP_STATUSES:
            continue
        j4 = data.get("j4_sent")
        if not j4:
            continue
        try:
            j4_date = date.fromisoformat(j4)
        except ValueError:
            continue
        if j4_date <= cutoff:
            eligible.append((email, data))

    eligible.sort(key=lambda x: x[1].get("j4_sent", ""))
    print(f"Prospects eligibles J10 (break-up) : {len(eligible)}")

    if not eligible:
        print("Aucun prospect eligible pour le break-up J10.")
        return

    today_count = count_today()
    print(f"Envoyes aujourd hui : {today_count}/{DAILY_LIMIT}")

    if args.dry_run:
        print("\n--- MODE DRY RUN ---\n")

    sent = 0
    for email, data in eligible:
        if today_count + sent >= DAILY_LIMIT:
            print(f"\nLimite journaliere atteinte ({DAILY_LIMIT}). Relancer demain.")
            break
        if args.limit and sent >= args.limit:
            print(f"\nLimite --limit {args.limit} atteinte.")
            break

        nom    = data.get("nom_entreprise", "")
        prenom = get_prenom(data.get("nom_dirigeant", ""))
        data["_prenom"] = prenom

        html    = make_html(data)
        text    = make_text(data)
        to_name = f"{prenom} — {nom}".strip(" —") if prenom else nom

        if args.dry_run:
            j0 = data.get("j0_sent", "?")
            j4 = data.get("j4_sent", "?")
            print(f"[DRY] {email} ({nom[:28]}) | J0:{j0} J4:{j4}")
            sent += 1
            continue

        ok, detail = send_brevo(email, to_name, SUBJECT, html, text)
        ts = datetime.now().strftime("%H:%M:%S")
        if ok:
            sent += 1
            db[email]["j10_sent"] = str(today)
            db[email]["status"]   = "j10_sent"
            log_send(email, nom, "OK", "j10")
            print(f"[{ts}] OK {sent:>4} -> {email} ({nom[:28]})")
        else:
            log_send(email, nom, "ERREUR", detail[:120])
            print(f"[{ts}] ERR -> {email} | {detail[:70]}", file=sys.stderr)

        if sent % 10 == 0:
            save_db(db)
        time.sleep(DELAY_BETWEEN)

    if not args.dry_run:
        save_db(db)

    print(f"\n{'='*50}")
    mode = "DRY RUN" if args.dry_run else "Campagne"
    print(f"{mode} J10 terminee : {sent}/{len(eligible)} envoyes")

if __name__ == "__main__":
    main()
