# Marché de l'emploi TI au Canada

Plateforme d'analyse des offres d'emploi en technologies de l'information (TI) publiées au Canada de janvier à septembre 2026.

Projet de synthèse réalisé par **Anta Mbaye SENE**, Université du Québec en Outaouais, session d'automne 2026.

## Pourquoi ce projet

Je suis finissante en informatique et je m'intéresse surtout aux données. En fin de parcours, la recherche d'un premier emploi peut être stressante : on ne sait pas toujours quelles professions recrutent, dans quelles provinces ni à quels salaires s'attendre. Ce tableau de bord regroupe les offres d'emploi TI publiées sur Guichet-Emplois pour rendre ces tendances plus faciles à lire, en particulier pour les finissants qui n'ont pas encore eu de stage ou d'emploi.

## Ce que montre le tableau de bord

- Nombre d'offres, de postes vacants et de professions TI
- Évolution mensuelle des offres et des postes vacants
- Répartition des offres par profession (15 codes CNP 2021)
- Répartition des offres par province et territoire
- Salaires horaires moyens estimés par profession, avec le taux d'offres dont le salaire est exploitable
- Filtres par province et par mois, qui s'appliquent à tous les indicateurs

## Données

- **Source :** fichiers ouverts d'offres d'emploi de [Guichet-Emplois](https://www.guichetemplois.gc.ca), publiés sur le Portail du gouvernement ouvert du Canada
- **Période :** 9 fichiers mensuels, de janvier à septembre 2026
- **Périmètre :** 15 codes de la Classification nationale des professions (CNP 2021) liés aux TI
- **Volume après traitement :** 11 380 offres et 12 214 postes vacants

Les fichiers CSV ne sont pas inclus dans le dépôt à cause de leur taille (environ 470 Mo). Ils doivent être placés dans `data/raw/` avant de lancer le traitement.

### Limites

- Les données couvrent seulement les offres publiées sur Guichet-Emplois, pas l'ensemble du marché canadien.
- Une offre peut annoncer plusieurs postes. Le nombre d'offres et le nombre de postes sont donc présentés séparément.
- Les salaires sont calculés uniquement à partir des offres qui annoncent un salaire horaire exploitable (environ 60 % des offres). Ce sont des salaires proposés, pas des salaires versés.

## Architecture

```
Fichiers CSV (Guichet-Emplois)
        │
        ▼
Traitement Python / pandas      notebooks/
        │
        ▼
Base PostgreSQL (Docker)        backend/schema.sql, backend/importation.py
        │
        ▼
API REST FastAPI                backend/main.py
        │
        ▼
Interface React + Recharts      frontend/
```

## Structure du projet

```
Projet synthèse/
├── backend/
│   ├── main.py               API FastAPI (routes /statistiques/...)
│   ├── database.py           Connexion à PostgreSQL
│   ├── schema.sql            Tables professions, regions, offres_emploi
│   ├── importation.py        Chargement du CSV traité dans la base
│   ├── indicateurs.sql       Requêtes d'analyse
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── App.jsx           Tableau de bord
│       └── App.css
├── notebooks/
│   ├── traitement_mensuel.py           Regroupement et filtrage des 9 fichiers
│   ├── harmonisation_professions.py    Harmonisation des noms de professions
│   ├── exploration.py
│   ├── indicateurs.py
│   └── verification_avril.py           Vérification du fichier d'avril (publié en anglais)
├── data/                     Non versionné
│   ├── raw/
│   └── processed/
├── docker-compose.yml
└── .env.example
```

## Lancer le projet

### Prérequis

- Docker Desktop
- Python 3.13
- Node.js et npm

### 1. Configurer le mot de passe

Copier le fichier d'exemple, puis choisir un mot de passe dans `.env` :

```bash
cp .env.example .env
```

Le fichier `.env` est lu automatiquement par Docker et par l'API. Il n'est pas versionné.

### 2. Démarrer la base de données

```bash
docker compose up -d
```

PostgreSQL est accessible sur le port **5433**. Si le conteneur existe déjà, utiliser plutôt `docker start projet_synthese_postgres`.

### 3. Préparer les données (première installation seulement)

```bash
python3 -m venv backend/.venv
source backend/.venv/bin/activate
pip install -r backend/requirements.txt pandas numpy

python notebooks/traitement_mensuel.py
python notebooks/harmonisation_professions.py

docker exec -i projet_synthese_postgres psql -U emploi_user -d emploi_ti < backend/schema.sql
python backend/importation.py
```

### 4. Lancer l'API

À partir de la racine du projet :

```bash
source backend/.venv/bin/activate
uvicorn backend.main:app --reload
```

L'API répond sur http://127.0.0.1:8000. La documentation interactive est disponible sur http://127.0.0.1:8000/docs.

### 5. Lancer l'interface

Dans un autre terminal :

```bash
cd frontend
npm install
npm run dev
```

Le tableau de bord est accessible sur http://localhost:5173.

## Routes de l'API

Toutes les routes `/statistiques/...` acceptent deux filtres facultatifs : `province` (ex. `Québec`) et `mois` (ex. `2026-03`).

| Route | Description |
|---|---|
| `GET /` | Message d'accueil |
| `GET /test-database` | Vérifie la connexion à PostgreSQL |
| `GET /statistiques/total-offres` | Nombre total d'offres |
| `GET /statistiques/generales` | Offres, postes vacants et nombre de professions |
| `GET /statistiques/mensuelles` | Offres et postes vacants par mois |
| `GET /statistiques/professions` | Offres par profession |
| `GET /statistiques/provinces` | Offres par province ou territoire |
| `GET /statistiques/qualite-salaires` | Répartition des offres selon le type de salaire |
| `GET /statistiques/salaires-professions` | Salaire horaire moyen estimé par profession |

Exemple : http://127.0.0.1:8000/statistiques/professions?province=Québec&mois=2026-06

## Technologies

Python, pandas, PostgreSQL 17, Docker, FastAPI, React, Vite, Recharts.