
import psycopg
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from backend.database import get_connection


# ============================================================
# 1. CONFIGURATION DE L'APPLICATION FASTAPI
# ============================================================

app = FastAPI(
    title="Analyse du marché de l'emploi TI au Canada",
    description="API REST pour analyser les offres d'emploi TI au Canada.",
    version="1.2.0"
)


# ============================================================
# 2. CONFIGURATION CORS POUR LE FRONTEND REACT
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)


# ============================================================
# 3. FONCTION COMMUNE POUR FILTRER PAR PROVINCE ET PAR MOIS
# ============================================================

def construire_filtres(province=None, mois=None):
    """
    Construit les conditions SQL et leurs paramètres.

    Les filtres sont facultatifs et peuvent être combinés :
    - Aucun filtre : toutes les offres
    - Province uniquement
    - Mois uniquement
    - Province et mois
    """
    conditions = []
    parametres = []

    if province is not None and province.strip():
        conditions.append("r.province = %s")
        parametres.append(province.strip())

    if mois is not None:
        conditions.append("o.mois_source = %s")
        parametres.append(mois)

    if conditions:
        return "WHERE " + " AND ".join(conditions), parametres

    return "", []


# ============================================================
# 4. ROUTE D'ACCUEIL
# ============================================================

@app.get("/")
def accueil():
    return {
        "message": (
            "Bienvenue sur l'API d'analyse du marché "
            "de l'emploi TI au Canada"
        )
    }


# ============================================================
# 5. NOMBRE TOTAL D'OFFRES
# ============================================================

@app.get("/statistiques/total-offres")
def total_offres(
    province: str | None = Query(default=None),
    mois: str | None = Query(
        default=None,
        pattern=r"^2026-(0[1-9])$"
    )
):
    try:
        condition, parametres = construire_filtres(province, mois)

        requete = f"""
            SELECT COUNT(*)
            FROM offres_emploi o
            JOIN regions r ON o.id_region = r.id_region
            {condition};
        """

        with get_connection() as connexion:
            with connexion.cursor() as curseur:
                curseur.execute(requete, parametres)
                total = curseur.fetchone()[0]

        return {"total_offres": total}

    except (psycopg.Error, KeyError) as erreur:
        raise HTTPException(
            status_code=500,
            detail="Impossible de récupérer le total des offres."
        ) from erreur


# ============================================================
# 6. INDICATEURS GÉNÉRAUX
# ============================================================

@app.get("/statistiques/generales")
def statistiques_generales(
    province: str | None = Query(default=None),
    mois: str | None = Query(
        default=None,
        pattern=r"^2026-(0[1-9])$"
    )
):
    try:
        condition, parametres = construire_filtres(province, mois)

        requete = f"""
            SELECT
                COUNT(*) AS nombre_offres,
                COALESCE(SUM(o.nombre_postes), 0) AS postes_vacants,
                COUNT(DISTINCT o.code_cnp) AS nombre_professions
            FROM offres_emploi o
            JOIN regions r ON o.id_region = r.id_region
            {condition};
        """

        with get_connection() as connexion:
            with connexion.cursor() as curseur:
                curseur.execute(requete, parametres)
                resultat = curseur.fetchone()

        return {
            "nombre_offres": resultat[0],
            "postes_vacants": resultat[1],
            "nombre_professions": resultat[2]
        }

    except (psycopg.Error, KeyError) as erreur:
        raise HTTPException(
            status_code=500,
            detail="Impossible de récupérer les statistiques générales."
        ) from erreur


# ============================================================
# 7. ÉVOLUTION MENSUELLE DES OFFRES
# ============================================================

@app.get("/statistiques/mensuelles")
def statistiques_mensuelles(
    province: str | None = Query(default=None),
    mois: str | None = Query(
        default=None,
        pattern=r"^2026-(0[1-9])$"
    )
):
    try:
        condition, parametres = construire_filtres(province, mois)

        requete = f"""
            SELECT
                o.mois_source AS mois,
                COUNT(*) AS nombre_offres,
                COALESCE(SUM(o.nombre_postes), 0) AS postes_vacants
            FROM offres_emploi o
            JOIN regions r ON o.id_region = r.id_region
            {condition}
            GROUP BY o.mois_source
            ORDER BY o.mois_source;
        """

        with get_connection() as connexion:
            with connexion.cursor() as curseur:
                curseur.execute(requete, parametres)
                resultats = curseur.fetchall()

        return [
            {
                "mois": ligne[0],
                "nombre_offres": ligne[1],
                "postes_vacants": ligne[2]
            }
            for ligne in resultats
        ]

    except (psycopg.Error, KeyError) as erreur:
        raise HTTPException(
            status_code=500,
            detail="Impossible de récupérer les statistiques mensuelles."
        ) from erreur


# ============================================================
# 8. TEST DE CONNEXION À POSTGRESQL
# ============================================================

@app.get("/test-database")
def tester_database():
    try:
        with get_connection() as connexion:
            with connexion.cursor() as curseur:
                curseur.execute("SELECT current_database();")
                resultat = curseur.fetchone()

        return {
            "message": "Connexion PostgreSQL réussie",
            "database": resultat[0]
        }

    except (psycopg.Error, KeyError) as erreur:
        raise HTTPException(
            status_code=500,
            detail="Erreur de connexion à PostgreSQL."
        ) from erreur


# ============================================================
# 9. RÉPARTITION DES OFFRES PAR PROFESSION
# ============================================================

@app.get("/statistiques/professions")
def statistiques_professions(
    province: str | None = Query(default=None),
    mois: str | None = Query(
        default=None,
        pattern=r"^2026-(0[1-9])$"
    )
):
    try:
        condition, parametres = construire_filtres(province, mois)

        requete = f"""
            SELECT
                p.code_cnp,
                p.nom_profession,
                COUNT(*) AS nombre_offres,
                COALESCE(SUM(o.nombre_postes), 0) AS postes_vacants
            FROM offres_emploi o
            JOIN professions p ON o.code_cnp = p.code_cnp
            JOIN regions r ON o.id_region = r.id_region
            {condition}
            GROUP BY p.code_cnp, p.nom_profession
            ORDER BY nombre_offres DESC;
        """

        with get_connection() as connexion:
            with connexion.cursor() as curseur:
                curseur.execute(requete, parametres)
                resultats = curseur.fetchall()

        return [
            {
                "code_cnp": ligne[0],
                "nom_profession": ligne[1],
                "nombre_offres": ligne[2],
                "postes_vacants": ligne[3]
            }
            for ligne in resultats
        ]

    except (psycopg.Error, KeyError) as erreur:
        raise HTTPException(
            status_code=500,
            detail="Impossible de récupérer les statistiques par profession."
        ) from erreur


# ============================================================
# 10. RÉPARTITION DES OFFRES PAR PROVINCE
# ============================================================

@app.get("/statistiques/provinces")
def statistiques_provinces(
    province: str | None = Query(default=None),
    mois: str | None = Query(
        default=None,
        pattern=r"^2026-(0[1-9])$"
    )
):
    try:
        condition, parametres = construire_filtres(province, mois)

        requete = f"""
            SELECT
                r.province,
                COUNT(*) AS nombre_offres,
                COALESCE(SUM(o.nombre_postes), 0) AS postes_vacants
            FROM offres_emploi o
            JOIN regions r ON o.id_region = r.id_region
            {condition}
            GROUP BY r.province
            ORDER BY nombre_offres DESC;
        """

        with get_connection() as connexion:
            with connexion.cursor() as curseur:
                curseur.execute(requete, parametres)
                resultats = curseur.fetchall()

        return [
            {
                "province": ligne[0],
                "nombre_offres": ligne[1],
                "postes_vacants": ligne[2]
            }
            for ligne in resultats
        ]

    except (psycopg.Error, KeyError) as erreur:
        raise HTTPException(
            status_code=500,
            detail="Impossible de récupérer les statistiques par province."
        ) from erreur


# ============================================================
# 11. QUALITÉ DES DONNÉES SALARIALES
# ============================================================

@app.get("/statistiques/qualite-salaires")
def statistiques_qualite_salaires(
    province: str | None = Query(default=None),
    mois: str | None = Query(
        default=None,
        pattern=r"^2026-(0[1-9])$"
    )
):
    try:
        condition, parametres = construire_filtres(province, mois)

        requete = f"""
            SELECT
                o.statut_salaire,
                COUNT(*) AS nombre_offres,
                ROUND(
                    AVG(o.salaire_horaire_estime), 2
                ) AS salaire_horaire_moyen
            FROM offres_emploi o
            JOIN regions r ON o.id_region = r.id_region
            {condition}
            GROUP BY o.statut_salaire
            ORDER BY nombre_offres DESC;
        """

        with get_connection() as connexion:
            with connexion.cursor() as curseur:
                curseur.execute(requete, parametres)
                resultats = curseur.fetchall()

        return [
            {
                "statut_salaire": ligne[0],
                "nombre_offres": ligne[1],
                "salaire_horaire_moyen": (
                    float(ligne[2])
                    if ligne[2] is not None
                    else None
                )
            }
            for ligne in resultats
        ]

    except (psycopg.Error, KeyError) as erreur:
        raise HTTPException(
            status_code=500,
            detail="Impossible de récupérer la qualité des données salariales."
        ) from erreur


# ============================================================
# 12. SALAIRES HORAIRES ESTIMÉS PAR PROFESSION
# ============================================================

@app.get("/statistiques/salaires-professions")
def statistiques_salaires_professions(
    province: str | None = Query(default=None),
    mois: str | None = Query(
        default=None,
        pattern=r"^2026-(0[1-9])$"
    )
):
    try:
        condition, parametres = construire_filtres(province, mois)

        condition_salaire = """
            o.statut_salaire = 'horaire_exploitable'
            AND o.salaire_horaire_estime IS NOT NULL
        """

        if condition:
            condition += f" AND {condition_salaire}"
        else:
            condition = f"WHERE {condition_salaire}"

        requete = f"""
            SELECT
                p.code_cnp,
                p.nom_profession,
                COUNT(*) AS offres_avec_salaire,
                ROUND(
                    AVG(o.salaire_horaire_estime), 2
                ) AS salaire_horaire_moyen
            FROM offres_emploi o
            JOIN professions p ON o.code_cnp = p.code_cnp
            JOIN regions r ON o.id_region = r.id_region
            {condition}
            GROUP BY p.code_cnp, p.nom_profession
            ORDER BY salaire_horaire_moyen DESC;
        """

        with get_connection() as connexion:
            with connexion.cursor() as curseur:
                curseur.execute(requete, parametres)
                resultats = curseur.fetchall()

        return [
            {
                "code_cnp": ligne[0],
                "nom_profession": ligne[1],
                "offres_avec_salaire": ligne[2],
                "salaire_horaire_moyen": float(ligne[3])
            }
            for ligne in resultats
        ]

    except (psycopg.Error, KeyError) as erreur:
        raise HTTPException(
            status_code=500,
            detail="Impossible de récupérer les salaires par profession."
        ) from erreur
