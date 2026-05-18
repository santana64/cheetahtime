"""
relance_cliqueurs.py — Email de relance pour les cliqueurs chauds

Groupe A (8 personnes) : ont cliqué sur /register → essai d'inscription bloqué
  -> Email : "Votre accès est prêt — 2 minutes pour démarrer"

Groupe B (9 personnes) : ont vu la démo sans s'inscrire
  -> Email : "Vous avez vu le devis — voici ce qu'il y a derrière"

Usage :
  python relance_cliqueurs.py --dry-run
  python relance_cliqueurs.py
"""

import csv, json, time, sys, os, urllib.request, urllib.error
from datetime import datetime

BREVO_API_KEY = "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"
SENDER_EMAIL  = "contact@chantierdevis.fr"
SENDER_NAME   = "Noah — ChantierDevis"
REPLY_TO      = "contact@chantierdevis.fr"
LOG_FILE      = "envois_log.csv"
DELAY         = 3.0

UTM_A = "utm_source=cold&utm_medium=email&utm_campaign=relance_register"
UTM_B = "utm_source=cold&utm_medium=email&utm_campaign=relance_demo"

# ── Groupe A : ont essayé de s'inscrire ──────────────────────────────────────

GROUPE_A = [
    {"email": "accueil@tlbmenuiseries.fr",          "nom": "TLB MENUISERIES",           "naf": "43.32A", "ville": "Peronnas"},
    {"email": "auch.thermie.energie@eiffage.com",   "nom": "POLYHABITAT OUEST",         "naf": "43.32A", "ville": "Mezeriat"},
    {"email": "castillon@castillon-sas.com",        "nom": "ENTREPRISE J. CASTILLO",    "naf": "43.34Z", "ville": "Divonne-les-Bains"},
    {"email": "contact@icrp-france.fr",             "nom": "G-CYT RENOV",               "naf": "43.34Z", "ville": "Plagne"},
    {"email": "contact@menuiseriepontcabanoise.fr", "nom": "HEGO JEAN-SEBASTIEN",       "naf": "43.22B", "ville": "Viel-Arcy"},
    {"email": "cpcp@cpcp.fr",                       "nom": "JDS ENTREPRISES",           "naf": "43.32B", "ville": "Bourg-en-Bresse"},
    {"email": "olivier.barbenchon@gmail.com",       "nom": "SIAR",                      "naf": "43.29A", "ville": "Dagneux"},
    {"email": "rehabilitation.construction@eiffage.com", "nom": "FLORIOT REHABILITATION", "naf": "41.20B", "ville": "Bourg-en-Bresse"},
]

# ── Groupe B : ont vu la démo sans s'inscrire ─────────────────────────────────

GROUPE_B = [
    {"email": "ajeti.eurl@gmail.com",       "nom": "AJETI",                         "naf": "43.31Z", "ville": "Ambronay"},
    {"email": "arpp.mellet@gmail.com",      "nom": "SAS E.R.2.A.",                  "naf": "43.33Z", "ville": "Bage-Dommartin"},
    {"email": "celebihalil131@gmail.com",   "nom": "HALIL AKYUREK",                 "naf": "43.31Z", "ville": "Lagnieu"},
    {"email": "contact@titan-construction.fr", "nom": "TITAN ISO",                  "naf": "43.29A", "ville": "Oyonnax"},
    {"email": "ecotherm22@gmail.com",       "nom": "ECOTHERM",                      "naf": "43.29A", "ville": "Chauny"},
    {"email": "ehk.batiment@gmail.com",     "nom": "EHK BATIMENT",                  "naf": "43.33Z", "ville": "Saint-Maurice-de-Beynost"},
    {"email": "europose@gmail.com",         "nom": "TRAVESSA EUROPOSE",             "naf": "43.29B", "ville": "Ars-sur-Formans"},
    {"email": "remybronchain@gmail.com",    "nom": "SPP STYLE PLATRERIE",           "naf": "43.31Z", "ville": "Beynost"},
    {"email": "tho.renovation@gmail.com",   "nom": "ALY MOHAMAD",                   "naf": "43.34Z", "ville": "Thoiry"},
]


def make_html_A(p):
    reg_url = f"https://chantierdevis.fr/register?{UTM_A}"
    nom = p["nom"].strip().title()
    ville = p["ville"].strip().title()
    return f"""<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Georgia,serif;font-size:16px;color:#1a1a1a;max-width:520px;margin:0 auto;padding:32px 20px;line-height:1.8">

<p style="margin:0 0 18px">Bonjour,</p>

<p style="margin:0 0 18px">
  Vous avez commencé à créer votre compte ChantierDevis il y a quelques jours
  — je voulais juste vous dire que tout fonctionne maintenant, l'accès est libre.
</p>

<p style="margin:0 0 18px">
  En 2 minutes vous pouvez générer votre premier devis : décrivez le chantier,
  l'IA génère les lignes avec vos marges visibles, le client signe depuis son téléphone.
</p>

<p style="text-align:center;margin:0 0 8px">
  <a href="{reg_url}"
     style="display:inline-block;background:#16a34a;color:#fff;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;font-family:Arial,sans-serif">
    Créer mon compte gratuit &rarr;
  </a>
</p>
<p style="text-align:center;margin:0 0 32px;font-size:12px;color:#999;font-family:Arial,sans-serif">
  Sans carte bancaire · Accès immédiat
</p>

<p style="margin:0 0 8px;font-family:Arial,sans-serif;font-size:15px">Bonne journée,</p>
<p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:15px;font-weight:bold">Noah</p>
<p style="margin:0 0 28px;font-family:Arial,sans-serif;font-size:13px;color:#888">Fondateur · <a href="https://chantierdevis.fr" style="color:#888;text-decoration:none">chantierdevis.fr</a></p>

<hr style="border:none;border-top:1px solid #e5e5e5;margin:24px 0">
<p style="font-size:11px;color:#bbb;line-height:1.6;margin:0;font-family:Arial,sans-serif">
  {nom} · {ville}.
  <a href="mailto:{REPLY_TO}?subject=Desinscription" style="color:#bbb">Me désinscrire</a>
</p>
</body></html>"""


def make_text_A(p):
    reg_url = f"https://chantierdevis.fr/register?{UTM_A}"
    return f"""Bonjour,

Vous avez commencé à créer votre compte ChantierDevis il y a quelques jours
— je voulais juste vous dire que tout fonctionne maintenant, l'accès est libre.

En 2 minutes vous pouvez générer votre premier devis : décrivez le chantier,
l'IA génère les lignes avec vos marges visibles, le client signe depuis son téléphone.

Créer mon compte gratuit (sans CB) :
{reg_url}

Bonne journée,
Noah — Fondateur · chantierdevis.fr

---
Pour ne plus recevoir nos emails : répondez STOP.
"""


def make_html_B(p):
    reg_url = f"https://chantierdevis.fr/register?{UTM_B}"
    nom = p["nom"].strip().title()
    ville = p["ville"].strip().title()
    return f"""<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Georgia,serif;font-size:16px;color:#1a1a1a;max-width:520px;margin:0 auto;padding:32px 20px;line-height:1.8">

<p style="margin:0 0 18px">Bonjour,</p>

<p style="margin:0 0 18px">
  Vous avez regardé la démo ChantierDevis — le devis de rénovation salle de bain
  généré en 30 secondes par l'IA, avec les marges visibles ligne par ligne.
</p>

<p style="margin:0 0 18px">
  Ce que vous avez vu, c'est exactement ce que vous pouvez créer pour vos propres chantiers.
  Vos prestations, vos tarifs, votre logo — le client reçoit le PDF et signe directement
  depuis son téléphone.
</p>

<p style="margin:0 0 18px">
  L'essai est gratuit, sans carte. Si ça ne colle pas, vous supprimez — c'est tout.
</p>

<p style="text-align:center;margin:0 0 8px">
  <a href="{reg_url}"
     style="display:inline-block;background:#16a34a;color:#fff;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;font-family:Arial,sans-serif">
    Essayer gratuitement &rarr;
  </a>
</p>
<p style="text-align:center;margin:0 0 32px;font-size:12px;color:#999;font-family:Arial,sans-serif">
  Sans carte bancaire · 2 minutes pour créer votre premier devis
</p>

<p style="margin:0 0 8px;font-family:Arial,sans-serif;font-size:15px">Bonne journée,</p>
<p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:15px;font-weight:bold">Noah</p>
<p style="margin:0 0 28px;font-family:Arial,sans-serif;font-size:13px;color:#888">Fondateur · <a href="https://chantierdevis.fr" style="color:#888;text-decoration:none">chantierdevis.fr</a></p>

<hr style="border:none;border-top:1px solid #e5e5e5;margin:24px 0">
<p style="font-size:11px;color:#bbb;line-height:1.6;margin:0;font-family:Arial,sans-serif">
  {nom} · {ville}.
  <a href="mailto:{REPLY_TO}?subject=Desinscription" style="color:#bbb">Me désinscrire</a>
</p>
</body></html>"""


def make_text_B(p):
    reg_url = f"https://chantierdevis.fr/register?{UTM_B}"
    return f"""Bonjour,

Vous avez regardé la démo ChantierDevis — le devis de rénovation salle de bain
généré en 30 secondes par l'IA, avec les marges visibles ligne par ligne.

Ce que vous avez vu, c'est exactement ce que vous pouvez créer pour vos propres chantiers.
Vos prestations, vos tarifs, votre logo — le client reçoit le PDF et signe
directement depuis son téléphone.

L'essai est gratuit, sans carte. Si ça ne colle pas, vous supprimez.

Essayer gratuitement :
{reg_url}

Bonne journée,
Noah — Fondateur · chantierdevis.fr

---
Pour ne plus recevoir nos emails : répondez STOP.
"""


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


def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    if args.dry_run:
        print("=== DRY RUN ===\n")

    todos = [
        ("A", "Votre accès ChantierDevis est prêt — 2 min pour démarrer", GROUPE_A, make_html_A, make_text_A),
        ("B", "Vous avez vu le devis — voici ce qu'il y a derrière", GROUPE_B, make_html_B, make_text_B),
    ]

    total = 0
    for groupe, subject, prospects, html_fn, text_fn in todos:
        print(f"\n{'='*55}")
        print(f"GROUPE {groupe} — {subject}")
        print(f"{'='*55}")
        for p in prospects:
            email = p["email"]
            nom   = p["nom"].strip().title()
            html  = html_fn(p)
            text  = text_fn(p)

            if args.dry_run:
                print(f"[DRY] -> {email} ({nom})")
                print(f"        Sujet : {subject}")
                continue

            ok, detail = send_brevo(email, nom, subject, html, text)
            ts = datetime.now().strftime("%H:%M:%S")
            if ok:
                total += 1
                log_send(email, nom, "OK", f"relance_{groupe}")
                print(f"[{ts}] OK  -> {email} ({nom})")
            else:
                log_send(email, nom, "ERREUR", detail[:120])
                print(f"[{ts}] ERR -> {email} | {detail[:60]}", file=sys.stderr)
            time.sleep(DELAY)

    if not args.dry_run:
        print(f"\nTotal envoyé : {total}/17")


if __name__ == "__main__":
    main()
