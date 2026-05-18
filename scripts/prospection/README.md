# Prospection ChantierDevis — Pipeline complet

Pipeline Python 100% gratuit pour collecter et enrichir une liste de prospects artisans BTP en France.

**Sources** : API Recherche Entreprises (data.gouv.fr / INSEE Sirene) — aucune clé API requise.

---

## Prérequis

- Python 3.8+
- Aucune dépendance externe (stdlib uniquement)

---

## Etape 1 — Collecte depuis l'API Sirene

```bash
# Tous les départements, objectif 1500 prospects
python collecte.py --limit 1500 --output prospects_brut.csv

# Un département précis
python collecte.py --dept 06 --limit 200 --output prospects_06.csv

# Plusieurs départements
python collecte.py --dept 06,13,69,75 --limit 500 --output prospects_idf.csv
```

**Ce que ça fait :**
- Interroge l'API publique `recherche-entreprises.api.gouv.fr`
- Filtre 18 codes NAF BTP (maçonnerie, peinture, plomberie, électricité, etc.)
- Récupère : SIRET, nom, adresse, site web, effectif, date création
- Classe chaque prospect P0/P1/P2 selon la qualité des données

---

## Etape 2 — Enrichissement email

```bash
# Sans Hunter.io (scraping uniquement)
python enrichissement.py --input prospects_brut.csv --output prospects_enrichis.csv

# Avec Hunter.io (25 recherches gratuites/mois — https://hunter.io)
python enrichissement.py --input prospects_brut.csv --output prospects_enrichis.csv --hunter-key VOTRE_CLE

# Uniquement les prospects P0 (avec site web, plus rapide)
python enrichissement.py --input prospects_brut.csv --only-p0
```

**Stratégies d'enrichissement :**
1. Scraping page d'accueil + /contact + /mentions-légales du site web
2. Hunter.io API (optionnel, 25 domaines gratuits/mois)

---

## Etape 3 — Export final

```bash
python export.py --input prospects_enrichis.csv
```

**Produit :**
- `prospects_final.csv` — tous les prospects triés P0 → P1 → P2
- `prospects_email.csv` — uniquement ceux avec email (prêts pour campagne)
- `stats.txt` — résumé par département, métier, taux d'email

---

## Pipeline complet en une fois

```bash
python collecte.py --limit 1500 && python enrichissement.py && python export.py
```

---

## Codes NAF couverts

| Code | Métier |
|------|--------|
| 43.34Z | Peinture et vitrerie |
| 43.31Z | Plâtrerie |
| 43.32A | Menuiserie bois et PVC |
| 43.32B | Menuiserie métallique et serrurerie |
| 43.33Z | Carrelage et parquets |
| 43.21A | Electricité tous locaux |
| 43.22A | Plomberie eau et gaz |
| 43.22B | Chauffage et climatisation |
| 43.29A | Isolation |
| 43.91A | Charpente |
| 43.91B | Couverture |
| 43.99C | Maçonnerie générale |
| 41.20A | Construction maisons individuelles |
| ... | + 5 autres |

---

## Conformité RGPD

- Données issues d'une source publique légale (Sirene / data.gouv.fr)
- Seuls les emails **professionnels** associés à une activité BTP sont collectés
- Chaque email envoyé doit inclure un lien de désinscription
- Conserver la colonne `source` dans le CSV pour traçabilité
