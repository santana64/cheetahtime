"""
envoi_email.py — Campagne email automatisee via Brevo (ex-Sendinblue)
Usage :
  python envoi_email.py --dry-run              # Apercu sans envoyer
  python envoi_email.py                        # Envoi reel
  python envoi_email.py --input batch_500.csv  # Fichier personnalise
  python envoi_email.py --limit 50             # Limiter a N envois
  python envoi_email.py --personalize          # Hooks IA ultra-personnalises

Prerequis :
  1. Compte gratuit sur brevo.com
  2. Menu : Parametres > Cles API > Creer une cle
  3. Copier la cle dans BREVO_API_KEY ci-dessous
  4. Verifier votre email expediteur dans Brevo (Parametres > Expediteurs)
"""

import csv, json, time, sys, os, re, urllib.request, urllib.error
from datetime import datetime

# ============================================================
# CONFIGURATION — A REMPLIR
# ============================================================

BREVO_API_KEY    = "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"
ANTHROPIC_API_KEY = "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"

SENDER_EMAIL     = "contact@chantierdevis.fr"
SENDER_NAME      = "Noah — ChantierDevis"
REPLY_TO         = "contact@chantierdevis.fr"

DAILY_LIMIT      = 280
DELAY_BETWEEN    = 2.0

INPUT_FILE       = "batch_500.csv"
LOG_FILE         = "envois_log.csv"
HOOKS_CACHE_FILE = "hooks_cache.json"

# Domaines webmail — pas de site pro a scraper
WEBMAIL = {
    "gmail.com", "googlemail.com",
    "hotmail.fr", "hotmail.com", "hotmail.es",
    "yahoo.fr", "yahoo.com", "yahoo.es",
    "outlook.fr", "outlook.com",
    "live.fr", "live.com",
    "orange.fr", "wanadoo.fr",
    "free.fr", "laposte.net",
    "sfr.fr", "neuf.fr",
    "9business.fr", "icloud.com",
    "me.com", "msn.com",
    "ymail.com",
}

# ============================================================
# TEMPLATE EMAIL — Personnalise par metier (NAF)
# ============================================================

METIER_CONFIG = {
    "43.22A": {
        "subject_tpl": "{prenom}, le client a signé avec l'autre plombier (il a répondu en premier)",
        "subject_def": "Le plombier qui répond en premier décroche le chantier",
        "hook": (
            "Un client appelle pour une fuite. Vous passez, vous evaluez — "
            "et pendant que vous retapez le devis le soir, il a deja accepte celui du concurrent "
            "qui l'a envoye depuis son telephone en sortant de chez lui.\n\n"
            "ChantierDevis vous permet d'envoyer ce devis en 2 minutes, depuis le chantier, "
            "avant meme de remonter dans votre camion."
        ),
        "ps": "P.S. Vos forfaits habituels (debouchage, remplacement robinet, ballon...) sont memorises — vous ne retapez plus jamais rien.",
    },
    "43.22B": {
        "subject_tpl": "{prenom}, chaudière en panne — votre devis avant que le client rappelle un autre",
        "subject_def": "Chaudière en panne : le devis qui arrive en premier gagne",
        "hook": (
            "Un client sans chauffage en hiver n'attend pas. "
            "Il appelle deux ou trois chauffagistes et signe avec le premier qui lui envoie un prix clair.\n\n"
            "Avec ChantierDevis, vous envoyez votre devis depuis votre telephone en 2 minutes "
            "— avant meme de quitter le chantier."
        ),
        "ps": "P.S. Vos references (chaudieres, PAC, VMC...) sont enregistrees une fois pour toutes.",
    },
    "43.34Z": {
        "subject_tpl": "{prenom}, le client a visité 3 peintres — il a signé avec celui qui a répondu le jour même",
        "subject_def": "En peinture, le premier devis propre gagne presque toujours",
        "hook": (
            "Le client a fait visiter son appartement a trois peintres la meme semaine. "
            "Vous avez fait le meilleur travail — mais votre devis est arrive deux jours apres les autres. "
            "Resultat : il a signe ailleurs.\n\n"
            "Avec ChantierDevis, vous envoyez un devis PDF professionnel depuis le chantier, en 2 minutes."
        ),
        "ps": "P.S. Vos tarifs au m2 (lasure, enduit, ravalement...) sont memorises — vous ajustez juste la surface.",
    },
    "43.21A": {
        "subject_tpl": "{prenom}, 12 postes à ressaisir à chaque mise aux normes — y'a mieux",
        "subject_def": "Devis électricité : fini de ressaisir les 12 mêmes postes",
        "hook": (
            "Mise aux normes, tableau, VMC — a chaque fois vous retapez les memes 10 a 15 lignes. "
            "Multiplie par le nombre de devis dans la semaine, ca fait beaucoup de temps perdu le soir.\n\n"
            "ChantierDevis memorise vos prestations habituelles. "
            "Vous ajustez les quantites, vous envoyez — le client signe depuis son telephone."
        ),
        "ps": "P.S. Le client recoit un PDF professionnel avec votre logo et peut signer directement sur son telephone.",
    },
    "43.31Z": {
        "subject_tpl": "{prenom}, recalculer vos m² de plâtrerie à chaque devis — y'a mieux",
        "subject_def": "Devis plâtrerie : calcul m² automatique, PDF en 2 min",
        "hook": (
            "Cloisons, doublages, plafonds BA13 — recalculer les surfaces a chaque chantier, "
            "c'est du temps pris sur votre soiree et une source d'erreurs.\n\n"
            "ChantierDevis fait le calcul avec vos tarifs, genere le PDF et l'envoie au client "
            "pour signature directement sur son telephone. En 2 minutes."
        ),
        "ps": "P.S. Vos prix au m2 sont enregistres une fois — vous ne les retapez jamais.",
    },
    "43.32A": {
        "subject_tpl": "{prenom}, votre catalogue menuiserie bois — le client le signe depuis son téléphone",
        "subject_def": "Devis menuiserie bois : catalogue mémorisé, signature en ligne",
        "hook": (
            "Portes, fenetres, volets, escaliers — chaque devis a ses references, ses cotes, ses finitions. "
            "Ressaisir tout ca a chaque fois, c'est long.\n\n"
            "ChantierDevis memorise votre catalogue. Vous selectionnez, vous ajustez, "
            "le client recoit le PDF et signe depuis son telephone."
        ),
        "ps": "P.S. Fini les allers-retours pour une signature — le client signe en un clic, vous recevez la confirmation.",
    },
    "43.32B": {
        "subject_tpl": "{prenom}, portails, garde-corps — vos références mémorisées une fois pour toutes",
        "subject_def": "Devis métallerie/serrurerie : références mémorisées, PDF en 2 min",
        "hook": (
            "Portails, garde-corps, serrurerie — vos references changent peu d'un chantier a l'autre. "
            "Alors pourquoi les ressaisir a chaque devis ?\n\n"
            "ChantierDevis les memorise une fois. Vous ajustez les dimensions, "
            "vous envoyez — le client signe directement depuis son telephone."
        ),
        "ps": "P.S. 14 jours gratuits, sans carte bancaire — si ca ne colle pas, vous supprimez.",
    },
    "43.33Z": {
        "subject_tpl": "{prenom}, calculer colle + joints + main d'oeuvre à la main — y'a mieux",
        "subject_def": "Devis carrelage : calcul surfaces automatique, PDF pro en 2 min",
        "hook": (
            "Surface au sol, surface murale, colle, joints, decoupe, main-d'oeuvre — "
            "chaque devis carrelage c'est le meme calcul qui prend 20 minutes a la main.\n\n"
            "ChantierDevis fait le calcul avec vos tarifs et genere un PDF professionnel en 2 minutes. "
            "Le client le signe directement depuis son telephone."
        ),
        "ps": "P.S. Vos tarifs sol/mur/terrasse/exterieur sont enregistres une fois pour toutes.",
    },
    "43.39Z": {
        "subject_tpl": "{prenom}, même chantier, mêmes finitions — pourquoi ressaisir à chaque fois ?",
        "subject_def": "Devis finitions : prestations mémorisées, PDF signable en 2 min",
        "hook": (
            "Peinture, revetements, parquet, finitions — vous faites souvent les memes prestations "
            "d'un chantier a l'autre. Ressaisir les memes lignes a chaque fois, c'est du temps perdu.\n\n"
            "ChantierDevis les memorise. Vous ajustez les quantites, vous envoyez, "
            "le client signe depuis son telephone."
        ),
        "ps": "P.S. Le client recoit un PDF avec votre logo — ca fait serieux et ca rassure.",
    },
    "43.91A": {
        "subject_tpl": "{prenom}, votre devis charpente — parti avant de descendre de l'échafaudage",
        "subject_def": "Devis charpente pro en 2 min depuis le chantier",
        "hook": (
            "Un chantier de charpente c'est souvent une liste longue : "
            "materiaux, assemblage, main-d'oeuvre, levage. "
            "Et un devis qui prend du temps a faire le soir apres une longue journee.\n\n"
            "ChantierDevis memorise vos postes habituels. "
            "Vous ajustez les volumes depuis votre telephone, le devis part en 2 minutes."
        ),
        "ps": "P.S. Le client peut signer directement sur son telephone — fini les impressions et les allers-retours.",
    },
    "43.91B": {
        "subject_tpl": "{prenom}, fuite de toiture — votre devis envoyé avant de redescendre",
        "subject_def": "Urgence toiture : devis envoyé depuis le toit en 2 minutes",
        "hook": (
            "Apres un orage, trois clients vous appellent pour une fuite. "
            "Vous passez voir le premier, vous evaluez les degats — "
            "et pendant que vous reflechissez au prix, les deux autres ont deja rappele quelqu'un d'autre.\n\n"
            "Avec ChantierDevis, vous envoyez le devis depuis votre telephone avant meme de redescendre. "
            "Le client l'a, il signe."
        ),
        "ps": "P.S. Vos forfaits (bande solin, faitages, zinguerie, nettoyage...) sont enregistres une fois.",
    },
    "43.29A": {
        "subject_tpl": "{prenom}, 15 dossiers MaPrimeRénov' en parallèle — comment vous gérez ?",
        "subject_def": "MaPrimeRénov' : gérez 15 devis isolation sans vous noyer",
        "hook": (
            "Depuis MaPrimeRenov', les demandes d'isolation n'arretent plus. "
            "C'est une bonne chose — sauf que gerer 10, 15, 20 dossiers en parallele avec des devis Word "
            "ou Excel, ca devient vite un cauchemar.\n\n"
            "ChantierDevis centralise tout : devis, relances automatiques, signatures. "
            "Vous voyez en un coup d'oeil ce qui est signe, ce qui attend, ce qui est a relancer."
        ),
        "ps": "P.S. Plus besoin de vous souvenir ou vous en etes avec chaque client — tout est visible d'un coup d'oeil.",
    },
    "43.29B": {
        "subject_tpl": "{prenom}, entre deux chantiers — votre devis envoyé depuis le parking",
        "subject_def": "Devis travaux d'installation en 2 min entre deux chantiers",
        "hook": (
            "Entre les visites chantier, les rendez-vous fournisseurs et les clients qui rappellent, "
            "trouver le temps de faire un devis propre le soir, c'est complique.\n\n"
            "Avec ChantierDevis, vous le faites depuis votre telephone en 2 minutes "
            "— dans votre voiture entre deux chantiers. Le client recoit un PDF pro et peut signer en ligne."
        ),
        "ps": "P.S. 14 jours gratuits, sans carte bancaire. Si ca ne convient pas, vous supprimez.",
    },
    "43.99A": {
        "subject_tpl": "{prenom}, vos systèmes d'étanchéité mémorisés — devis en 2 min",
        "subject_def": "Devis étanchéité : systèmes mémorisés, PDF signable en ligne",
        "hook": (
            "Toiture-terrasse, sous-sol, facade, releves — vos chantiers d'etancheite sont techniques "
            "et les devis prennent du temps a rediger correctement.\n\n"
            "ChantierDevis memorise vos systemes habituels (etancheite bicouche, monocouche, drainage...). "
            "Vous ne ressaisissez jamais deux fois les memes lignes."
        ),
        "ps": "P.S. Le client signe directement sur son telephone — vous avez son accord immediatement.",
    },
    "43.99C": {
        "subject_tpl": "{prenom}, dalle, murs, enduits — votre devis maçonnerie sans tout ressaisir",
        "subject_def": "Devis maçonnerie pro en 2 min — vos postes mémorisés",
        "hook": (
            "Fondations, dalle, murs parpaings, enduits — un chantier de maconnerie c'est souvent "
            "une longue liste de postes a remettre a chaque fois.\n\n"
            "ChantierDevis les memorise avec vos tarifs. "
            "Vous ajustez les quantites, le devis est pret en 2 minutes — "
            "le client le signe directement depuis son telephone."
        ),
        "ps": "P.S. Vos clients peuvent signer en ligne — pas besoin d'imprimer ni de se deplacer.",
    },
    "43.99D": {
        "subject_tpl": "{prenom}, vos prestations techniques mémorisées — devis en 2 min",
        "subject_def": "Devis travaux spécialisés en 2 min — PDF pro signable",
        "hook": (
            "Vos chantiers sont techniques et chaque devis demande du soin. "
            "Mais ressaisir les memes prestations d'un chantier a l'autre, ca prend du temps inutilement.\n\n"
            "ChantierDevis memorise vos postes habituels avec vos tarifs. "
            "Vous ajustez, vous envoyez — le client signe depuis son telephone."
        ),
        "ps": "P.S. 14 jours gratuits, sans carte — si ca ne colle pas, vous supprimez et c'est tout.",
    },
    "41.20A": {
        "subject_tpl": "{prenom}, un projet de maison — des dizaines de devis à suivre en même temps",
        "subject_def": "Construction maison : suivez tous vos devis depuis votre téléphone",
        "hook": (
            "Un projet de construction de maison c'est des mois de travail, "
            "des dizaines d'avenants et des clients qui veulent des mises a jour regulieres.\n\n"
            "ChantierDevis centralise tous vos devis, les relances et les signatures. "
            "Vous voyez en un coup d'oeil ce qui est signe, ce qui est en attente, ce qui est a relancer — "
            "depuis votre telephone."
        ),
        "ps": "P.S. Le client suit l'avancement et signe les avenants directement en ligne.",
    },
    "41.20B": {
        "subject_tpl": "{prenom}, entre deux réunions de chantier — votre devis envoyé depuis votre tel",
        "subject_def": "Devis bâtiment pro en 2 min — gérez tout depuis votre téléphone",
        "hook": (
            "Les journees de chantier ne laissent pas beaucoup de temps pour l'administratif. "
            "Faire un devis propre le soir apres une longue journee, c'est souvent la derniere envie.\n\n"
            "Avec ChantierDevis, vous le faites depuis votre telephone en 2 minutes "
            "— entre deux reunions ou dans votre voiture. Le client recoit un PDF pro et signe en ligne."
        ),
        "ps": "P.S. 14 jours gratuits, sans carte bancaire.",
    },
}

DEFAULT_METIER_CONFIG = {
    "subject_tpl": "{prenom}, pendant que vous retapez votre devis — le concurrent l'a déjà envoyé",
    "subject_def": "Devis BTP en 2 min depuis votre téléphone — le client signe en ligne",
    "hook": (
        "En BTP, le premier devis professionnel envoye gagne presque toujours. "
        "Pas parce qu'il est moins cher — parce que le client a eu sa reponse, il est rassure, il signe.\n\n"
        "ChantierDevis vous permet de l'envoyer en 2 minutes depuis votre telephone, "
        "directement sur le chantier, avec votre logo et vos tarifs."
    ),
    "ps": "P.S. Vos prestations habituelles sont memorisees — vous ne retapez jamais deux fois les memes lignes.",
}

UTM      = "utm_source=cold&utm_medium=email&utm_campaign=v5_ai"
UTM_REG  = "utm_source=cold&utm_medium=email&utm_campaign=v5_ai_reg"


# ============================================================
# PERSONNALISATION IA
# ============================================================

def get_email_domain(email):
    parts = email.lower().split("@")
    return parts[1].strip() if len(parts) == 2 else None

def is_pro_domain(email):
    domain = get_email_domain(email)
    return domain and domain not in WEBMAIL

def _scrape_url(url, timeout=6):
    """Tente de recuperer le texte utile d une URL. Retourne str ou None."""
    try:
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "Mozilla/5.0 (compatible; ChantierDevis/1.0)"}
        )
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read(80000).decode("utf-8", errors="ignore")
        # Retirer scripts/styles
        raw = re.sub(r'<script[^>]*>.*?</script>', '', raw, flags=re.DOTALL | re.IGNORECASE)
        raw = re.sub(r'<style[^>]*>.*?</style>', '', raw, flags=re.DOTALL | re.IGNORECASE)
        # Extraire texte des balises <p> substantielles (> 60 chars)
        paragraphs = re.findall(r'<p[^>]*>(.*?)</p>', raw, flags=re.DOTALL | re.IGNORECASE)
        p_texts = []
        for p in paragraphs:
            clean = re.sub(r'<[^>]+>', ' ', p)
            clean = re.sub(r'\s+', ' ', clean).strip()
            if len(clean) > 60:
                p_texts.append(clean)
        if p_texts:
            return " ".join(p_texts)[:1800]
        # Fallback : texte brut si pas de <p> suffisants
        text = re.sub(r'<[^>]+>', ' ', raw)
        text = re.sub(r'\s+', ' ', text).strip()
        return text[:1500] if len(text) > 100 else None
    except Exception:
        return None

def fetch_website_text(domain, timeout=6):
    """Recupere le texte utile du site — home d abord, puis sous-pages toujours."""
    homepages = [
        f"https://www.{domain}",
        f"https://{domain}",
        f"http://www.{domain}",
    ]
    subpages = [
        f"https://www.{domain}/a-propos",
        f"https://{domain}/a-propos",
        f"https://www.{domain}/services",
        f"https://{domain}/services",
        f"https://www.{domain}/metiers",
    ]
    collected = []
    # Homepage : prend le premier qui repond
    for url in homepages:
        text = _scrape_url(url, timeout=timeout)
        if text:
            collected.append(text)
            break
    # Sous-pages : toujours tentees pour enrichir le contexte
    for url in subpages:
        text = _scrape_url(url, timeout=timeout)
        if text:
            collected.append(text)
        if sum(len(t) for t in collected) > 1800:
            break
    if not collected:
        return None
    combined = " ".join(collected)
    return combined[:2000]

def generate_hook_claude(row, website_text):
    nom    = row.get("nom_entreprise", "").strip()
    naf    = row.get("naf_code", "")
    ville  = row.get("ville", "").strip()
    metier = get_metier_label(naf)
    site   = website_text or "(non disponible)"

    lines = [
        "Tu es copywriter expert en cold email BTP en France.",
        "",
        f"Entreprise : {nom}",
        f"Metier : {metier}",
        f"Ville : {ville}",
        f"Contenu site web : {site}",
        "",
        "Genere un objet email et une accroche pour un cold email ChantierDevis",
        "(outil devis BTP par IA, signature en ligne).",
        "",
        'Reponds UNIQUEMENT avec un objet JSON valide, sans markdown :',
        '{"subject": "...", "hook": "..."}',
        "",
        "Regles subject : 55 car max, FOMO douleur specifique metier/ville, pas de !",
        "Regles hook : 1-2 phrases texte brut, ZERO markdown, commence direct,",
        "utilise UN detail concret du site si dispo, sinon douleur metier, ton direct zero flatterie.",
    ]
    prompt = "\n".join(lines)

    payload = {
        "model": "claude-haiku-4-5-20251001",
        "max_tokens": 280,
        "messages": [{"role": "user", "content": prompt}]
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=data,
        headers={
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            raw = json.loads(resp.read().decode())["content"][0]["text"].strip()
        m = re.search(r'\{[^{}]+\}', raw, re.DOTALL)
        if not m:
            return None
        parsed  = json.loads(m.group())
        hook    = parsed.get("hook", "").strip()
        subject = parsed.get("subject", "").strip()
        if hook and subject:
            return {"hook": hook, "subject": subject}
        return None
    except Exception:
        return None


def load_hooks_cache():
    if os.path.exists(HOOKS_CACHE_FILE):
        with open(HOOKS_CACHE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}

def save_hooks_cache(cache):
    with open(HOOKS_CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)

PROSPECT_DB_FILE = "prospects_db.json"

def load_prospect_db():
    if os.path.exists(PROSPECT_DB_FILE):
        with open(PROSPECT_DB_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}

def update_prospect_db_entry(db, email, row, subject_used, hook_used):
    """Met a jour l entree J0 dans le dict db en memoire (sans ecrire sur disque)."""
    today = datetime.today().strftime("%Y-%m-%d")
    if email not in db:
        db[email] = {
            "nom_entreprise":  row.get("nom_entreprise", "").strip(),
            "nom_dirigeant":   row.get("nom_dirigeant", "").strip(),
            "naf_code":        row.get("naf_code", ""),
            "ville":           row.get("ville", "").strip(),
            "hook":            hook_used or "",
            "subject_j0":      subject_used,
            "j0_sent":         today,
            "j4_sent":         None,
            "j10_sent":        None,
            "status":          "j0_sent",
        }
    else:
        if db[email].get("status") == "j0_sent":
            db[email]["j0_sent"] = today

def flush_prospect_db(db):
    with open(PROSPECT_DB_FILE, "w", encoding="utf-8") as f:
        json.dump(db, f, ensure_ascii=False, indent=2)


def build_hooks(rows, dry_run=False):
    """Pre-genere les hooks IA pour tous les prospects pro-domain du batch."""
    cache = load_hooks_cache()
    hooks = {}
    total = sum(1 for r in rows if is_pro_domain(r.get("email", "")))
    done  = 0

    print(f"\n[IA] Generation des hooks personnalises ({total} domaines pro)...")

    for row in rows:
        email = row.get("email", "").strip().lower()
        if not is_pro_domain(email):
            continue

        if email in cache:
            hooks[email] = cache[email]
            continue

        if dry_run:
            hooks[email] = f"[DRY] Hook IA pour {row.get('nom_entreprise','')}"
            done += 1
            continue

        domain       = get_email_domain(email)
        website_text = fetch_website_text(domain)
        hook         = generate_hook_claude(row, website_text)

        if hook:
            hooks[email]  = hook  # dict {"hook":..., "subject":...}
            cache[email]  = hook
            done += 1
            status = "OK"
        else:
            status = "fallback"

        print(f"  [{done:>3}/{total}] {status:8} {email[:45]}")

        save_hooks_cache(cache)
        time.sleep(0.3)

    print(f"[IA] Hooks generes : {done}/{total} | Fallbacks v4 : {total - done}\n")
    return hooks


# ============================================================
# UTILITAIRES
# ============================================================

NAF_LABELS = {
    "43.34Z": "peinture et vitrerie",
    "43.31Z": "platrerie",
    "43.32A": "menuiserie bois et PVC",
    "43.32B": "menuiserie metallique",
    "43.33Z": "carrelage et parquet",
    "43.39Z": "travaux de finition",
    "43.21A": "electricite",
    "43.22A": "plomberie",
    "43.22B": "chauffage et climatisation",
    "43.29A": "isolation",
    "43.29B": "autres installations",
    "43.91A": "charpente",
    "43.91B": "couverture",
    "43.99C": "maconnerie",
    "43.99A": "etancheite",
    "43.99D": "travaux specialises",
    "41.20A": "construction de maisons",
    "41.20B": "construction de batiments",
}

def get_metier_label(naf):
    return NAF_LABELS.get(naf, "batiment et travaux publics")

def get_metier_config(naf):
    return METIER_CONFIG.get(naf, DEFAULT_METIER_CONFIG)

def get_prenom(nom_dirigeant):
    if not nom_dirigeant:
        return ""
    clean = nom_dirigeant.split("(")[0].strip()
    parts = clean.split()
    if not parts:
        return ""
    all_upper = all(p == p.upper() for p in parts)
    if all_upper:
        return ""
    for part in parts:
        if part != part.upper() and len(part) >= 2:
            candidate = part.capitalize()
            if candidate.upper() not in {"M", "MME", "MR", "DR", "SAS", "SARL", "EI", "SCI", "EURL"}:
                return candidate
    return ""

def load_sent():
    sent = set()
    if not os.path.exists(LOG_FILE):
        return sent
    with open(LOG_FILE, newline="", encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            if row.get("statut") == "OK":
                sent.add(row.get("email", "").lower())
    return sent

def log_send(email, nom, statut, detail=""):
    exists = os.path.exists(LOG_FILE)
    with open(LOG_FILE, "a", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f)
        if not exists:
            w.writerow(["date", "email", "nom_entreprise", "statut", "detail"])
        w.writerow([datetime.now().strftime("%Y-%m-%d %H:%M:%S"), email, nom, statut, detail])

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


# ============================================================
# CONSTRUCTION EMAIL
# ============================================================

def make_subject(row):
    naf    = row.get("naf_code", "")
    prenom = get_prenom(row.get("nom_dirigeant", ""))
    cfg    = get_metier_config(naf)
    if prenom:
        return cfg["subject_tpl"].format(prenom=prenom)
    return cfg["subject_def"]

def make_html(row, custom_hook=None):
    prenom     = get_prenom(row.get("nom_dirigeant", ""))
    nom_entrep = row.get("nom_entreprise", "votre entreprise").strip().title()
    naf        = row.get("naf_code", "")
    cfg        = get_metier_config(naf)
    ville      = row.get("ville", "").strip().title()

    salutation   = f"Bonjour {prenom}," if prenom else "Bonjour,"
    ville_phrase = f" a {ville}" if ville else ""
    hook_text    = custom_hook if custom_hook else cfg["hook"]
    hook_html    = hook_text.replace("\n\n", "</p><p style=\"margin:0 0 16px\">")
    demo_url     = f"https://chantierdevis.fr/demo?{UTM}"
    register_url = f"https://chantierdevis.fr/register?{UTM_REG}"

    return f"""<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Georgia,serif;font-size:16px;color:#1a1a1a;max-width:540px;margin:0 auto;padding:32px 22px;line-height:1.8">
<span style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;color:#fefefe;line-height:1px">Devis PDF professionnel en 2 minutes depuis le chantier — marge visible avant d’envoyer, le client signe depuis son téléphone.&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;</span>

<p style="margin:0 0 20px">{salutation}</p>

<p style="margin:0 0 16px">{hook_html}</p>

<p style="margin:0 0 22px;font-size:14px;color:#444;font-style:italic">
  J'ai mis en ligne un exemple reel{ville_phrase} : un devis renovation salle de bain genere en 30 secondes par l'IA, avec les marges visibles ligne par ligne.
</p>

<p style="text-align:center;margin:0 0 8px">
  <a href="{demo_url}"
     style="display:inline-block;background:#16a34a;color:#fff;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;font-family:Arial,sans-serif;letter-spacing:0.3px">
    Voir le devis &rarr;
  </a>
</p>
<p style="text-align:center;margin:0 0 32px;font-size:12px;color:#999;font-family:Arial,sans-serif">Sans compte · 10 secondes · gratuit</p>

<p style="margin:0 0 8px;font-family:Arial,sans-serif;font-size:15px">Bonne journee,</p>
<p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:15px;font-weight:bold">Noah</p>
<p style="margin:0 0 28px;font-family:Arial,sans-serif;font-size:13px;color:#888">Fondateur · <a href="https://chantierdevis.fr" style="color:#888;text-decoration:none">chantierdevis.fr</a></p>

<div style="border-left:3px solid #d1fae5;padding:10px 14px;margin:0 0 24px;background:#f0fdf4;border-radius:0 6px 6px 0">
  <p style="margin:0 0 6px;font-family:Arial,sans-serif;font-size:13px;color:#166534">{cfg["ps"]}</p>
  <p style="margin:0;font-family:Arial,sans-serif;font-size:13px">
    <a href="{register_url}" style="color:#16a34a;font-weight:bold;text-decoration:none">Essayer 14 jours gratuitement (sans CB) &rarr;</a>
  </p>
</div>

<hr style="border:none;border-top:1px solid #e5e5e5;margin:24px 0">
<p style="font-size:11px;color:#bbb;line-height:1.6;margin:0;font-family:Arial,sans-serif">
  Vous recevez ce message car {nom_entrep} est referencee dans les bases publiques INSEE/Sirene.
  <a href="mailto:{REPLY_TO}?subject=Desinscription&body=Merci+de+me+retirer+de+votre+liste" style="color:#bbb">Me desinscrire</a>
</p>

</body>
</html>"""


def make_text(row, custom_hook=None):
    prenom       = get_prenom(row.get("nom_dirigeant", ""))
    naf          = row.get("naf_code", "")
    cfg          = get_metier_config(naf)
    ville        = row.get("ville", "").strip().title()
    salutation   = f"Bonjour {prenom}," if prenom else "Bonjour,"
    ville_phrase = f" a {ville}" if ville else ""
    hook_text    = custom_hook if custom_hook else cfg["hook"]
    demo_url     = f"https://chantierdevis.fr/demo?{UTM}"
    register_url = f"https://chantierdevis.fr/register?{UTM_REG}"

    return f"""{salutation}

{hook_text}

J'ai mis en ligne un exemple reel{ville_phrase} : un devis renovation salle de bain
genere en 30 secondes par l'IA, avec les marges visibles ligne par ligne.

Voir le devis (sans compte, 10 secondes) :
{demo_url}

Bonne journee,
Noah
Fondateur · chantierdevis.fr

---
{cfg["ps"]}
Essai gratuit 14 jours, sans CB : {register_url}

---
Pour ne plus recevoir nos emails : repondez STOP a cet email.
"""


# ============================================================
# ENVOI BREVO
# ============================================================

def send_brevo(to_email, to_name, subject, html, text):
    payload = {
        "sender":    {"name": SENDER_NAME, "email": SENDER_EMAIL},
        "to":        [{"email": to_email, "name": to_name}],
        "replyTo":   {"email": REPLY_TO},
        "subject":   subject,
        "htmlContent": html,
        "textContent": text,
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        "https://api.brevo.com/v3/smtp/email",
        data=data,
        headers={
            "api-key":      BREVO_API_KEY,
            "Content-Type": "application/json",
            "Accept":       "application/json",
        },
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return True, resp.read().decode()
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        return False, f"HTTP {e.code}: {body}"
    except Exception as e:
        return False, str(e)


# ============================================================
# PIPELINE PRINCIPAL
# ============================================================

def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--input",       default=INPUT_FILE)
    parser.add_argument("--dry-run",     action="store_true", help="Apercu sans envoyer")
    parser.add_argument("--limit",       type=int, default=0, help="Nb max d'envois (0=tous)")
    parser.add_argument("--personalize", action="store_true", help="Hooks IA ultra-personnalises")
    args = parser.parse_args()

    if not args.dry_run:
        if "VOTRE-CLE-API" in BREVO_API_KEY:
            print("ERREUR : Remplissez BREVO_API_KEY dans le script.", file=sys.stderr)
            sys.exit(1)
        if args.personalize and ANTHROPIC_API_KEY == "YOUR_ANTHROPIC_API_KEY":
            print("ERREUR : Remplissez ANTHROPIC_API_KEY dans le script pour utiliser --personalize.", file=sys.stderr)
            sys.exit(1)

    with open(args.input, newline="", encoding="utf-8-sig") as f:
        rows = list(csv.DictReader(f))
    print(f"Prospects charges : {len(rows)}")

    sent_already = load_sent()
    print(f"Deja envoyes (log) : {len(sent_already)}")

    today_count = count_today()
    print(f"Envoyes aujourd'hui : {today_count}/{DAILY_LIMIT}")

    # Pre-generation des hooks IA si --personalize
    hooks = {}
    if args.personalize:
        pending = [r for r in rows if r.get("email","").strip().lower() not in sent_already]
        hooks = build_hooks(pending, dry_run=args.dry_run)

    if args.dry_run:
        print("\n--- MODE DRY RUN (aucun email envoye) ---\n")

    prospect_db = load_prospect_db()
    sent_now = 0
    skipped  = 0
    errors   = 0

    for row in rows:
        email = row.get("email", "").strip().lower()
        nom   = row.get("nom_entreprise", "").strip()

        if not email:
            skipped += 1
            continue
        if email in sent_already:
            skipped += 1
            continue
        if today_count + sent_now >= DAILY_LIMIT:
            print(f"\nLimite journaliere atteinte ({DAILY_LIMIT}). Relancer demain.")
            break
        if args.limit and sent_now >= args.limit:
            print(f"\nLimite --limit {args.limit} atteinte.")
            break

        hook_data   = hooks.get(email, {})
        custom_hook = hook_data.get("hook") if isinstance(hook_data, dict) else hook_data
        ai_subject  = hook_data.get("subject") if isinstance(hook_data, dict) else None
        subject     = ai_subject or make_subject(row)
        html        = make_html(row, custom_hook)
        text        = make_text(row, custom_hook)
        prenom      = get_prenom(row.get("nom_dirigeant", ""))
        to_name     = f"{prenom} — {nom}".strip(" —") if prenom else nom
        hook_type   = "IA" if custom_hook else "v4"

        if args.dry_run:
            print(f"[DRY] [{hook_type}] -> {email} | {nom} | {get_metier_label(row.get('naf_code',''))}")
            if custom_hook:
                print(f"       Hook : {custom_hook[:80]}...")
            sent_now += 1
            continue

        ok, detail = send_brevo(email, to_name, subject, html, text)
        ts = datetime.now().strftime("%H:%M:%S")

        if ok:
            sent_now += 1
            log_send(email, nom, "OK", hook_type)
            update_prospect_db_entry(prospect_db, email, row, subject, custom_hook)
            if sent_now % 10 == 0:
                flush_prospect_db(prospect_db)
            print(f"[{ts}] OK [{hook_type}] {sent_now:>4} -> {email} ({nom[:30]})")
        else:
            errors += 1
            log_send(email, nom, "ERREUR", detail[:120])
            print(f"[{ts}] ERR           -> {email} | {detail[:80]}", file=sys.stderr)

        time.sleep(DELAY_BETWEEN)

    if not args.dry_run:
        flush_prospect_db(prospect_db)

    print(f"\n{'='*50}")
    if args.dry_run:
        print(f"DRY RUN termine : {sent_now} emails previsualisés")
    else:
        ai_count = sum(1 for v in [hooks.get(r.get("email","").strip().lower()) for r in rows] if v)
        print(f"Campagne terminee")
        print(f"  Envoyes  : {sent_now}  (IA: {min(ai_count, sent_now)} | v4: {sent_now - min(ai_count, sent_now)})")
        print(f"  Erreurs  : {errors}")
        print(f"  Ignores  : {skipped}")
        print(f"  Log      : {LOG_FILE}")
        if sent_now > 0:
            print(f"\nRelancer demain pour la suite (reprise automatique).")


if __name__ == "__main__":
    main()
