
from pathlib import Path
import os

import pandas as pd
import psycopg

# =====================================================
# 1. CHEMINS ET CONFIGURATION
# =====================================================

BASE_DIR = Path(__file__).resolve().parent.parent

FICHIER_CSV = (
    BASE_DIR / "data" / "processed"
    / "job_bank_ti_harmonise.csv"
)

# Identifiants locaux de développement
DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", "5433")),
    "dbname": os.getenv("DB_NAME", "emploi_ti"),
    "user": os.getenv("DB_USER", "emploi_user"),
    "password": os.getenv("DB_PASSWORD", "emploi_dev_local"),
}

# =====================================================
# 2. LECTURE ET VÉRIFICATION
# =====================================================

df = pd.read_csv(FICHIER_CSV, encoding="utf-8-sig")

if len(df) != 11380:
    raise ValueError(
        f"Nombre d'offres inattendu : {len(df)}"
    )

if df["ID WIC Lieu emploi"].isna().any():
    raise ValueError("Certains identifiants sont manquants.")

if df["ID WIC Lieu emploi"].duplicated().any():
    raise ValueError("Des identifiants sont répétés.")

print("Fichier chargé :", len(df), "offres")

# Conversion des valeurs manquantes pandas en None
def nettoyer(valeur):
    if pd.isna(valeur):
        return None
    if hasattr(valeur, "item"):
        return valeur.item()
    return valeur

# =====================================================
# 3. PRÉPARATION DES PROFESSIONS
# =====================================================

professions = (
    df[["Code CNP 2021", "Code CNP21 nom"]]
    .drop_duplicates()
)

lignes_professions = [
    (int(code), nom)
    for code, nom in professions.itertuples(
        index=False, name=None
    )
]

# =====================================================
# 4. PRÉPARATION DES RÉGIONS
# =====================================================

colonnes_regions = [
    "Provinces/Territoires",
    "Ville",
    "Région économique",
]

regions = df[colonnes_regions].drop_duplicates()

lignes_regions = [
    tuple(nettoyer(v) for v in ligne)
    for ligne in regions.itertuples(
        index=False, name=None
    )
]

# =====================================================
# 5. IMPORTATION POSTGRESQL
# =====================================================

with psycopg.connect(**DB_CONFIG) as connexion:

    with connexion.cursor() as curseur:

        # 5.1 Professions
        curseur.executemany(
            """
            INSERT INTO professions (
                code_cnp, nom_profession
            )
            VALUES (%s, %s)
            ON CONFLICT (code_cnp)
            DO UPDATE SET
                nom_profession = EXCLUDED.nom_profession
            """,
            lignes_professions
        )

        print("Professions importées :", len(lignes_professions))

        # 5.2 Régions
        # On recharge les régions proprement pour éviter
        # les doublons lors d'une nouvelle exécution.
        # Les offres doivent être vides avant cette opération.

        curseur.execute(
            "SELECT COUNT(*) FROM offres_emploi"
        )

        if curseur.fetchone()[0] != 0:
            raise RuntimeError(
                "La table offres_emploi contient déjà "
                "des données. Importation interrompue."
            )

        curseur.execute("DELETE FROM regions")

        curseur.executemany(
            """
            INSERT INTO regions (
                province, ville, region_economique
            )
            VALUES (%s, %s, %s)
            """,
            lignes_regions
        )

        curseur.execute(
            """
            SELECT
                id_region,
                province,
                ville,
                region_economique
            FROM regions
            """
        )

        correspondance_regions = {}

        for id_region, province, ville, region in curseur.fetchall():
            cle = (province, ville, region)
            correspondance_regions[cle] = id_region

        print("Régions importées :", len(correspondance_regions))

        # 5.3 Offres d'emploi
        lignes_offres = []

        for ligne in df.to_dict("records"):

            cle_region = (
                nettoyer(ligne["Provinces/Territoires"]),
                nettoyer(ligne["Ville"]),
                nettoyer(ligne["Région économique"]),
            )

            id_region = correspondance_regions[cle_region]

            valeurs = (
                nettoyer(ligne["ID WIC Lieu emploi"]),
                nettoyer(ligne["Code CNP 2021"]),
                id_region,
                nettoyer(ligne["Appellation d'emploi"]),
                nettoyer(
                    ligne[
                        "Date initiale affichage de l'offre d'emploi"
                    ]
                ),
                nettoyer(ligne["Nombre de postes vacants"]),
                nettoyer(ligne["Niveau d'expérience"]),
                nettoyer(ligne["Éducation Niveau d'études"]),
                nettoyer(ligne["Période d'emploi"]),
                nettoyer(ligne["Conditions d'emploi"]),
                nettoyer(ligne["Salaire par"]),
                nettoyer(ligne["Salaire Minimum"]),
                nettoyer(ligne["Salaire Maximum"]),
                nettoyer(ligne["statut_salaire"]),
                nettoyer(ligne["salaire_horaire_estime"]),
                nettoyer(ligne["mois_source"]),
            )

            lignes_offres.append(valeurs)

        curseur.executemany(
            """
            INSERT INTO offres_emploi (
                id_offre,
                code_cnp,
                id_region,
                appellation_emploi,
                date_affichage,
                nombre_postes,
                niveau_experience,
                niveau_etudes,
                periode_emploi,
                conditions_emploi,
                salaire_par,
                salaire_minimum,
                salaire_maximum,
                statut_salaire,
                salaire_horaire_estime,
                mois_source
            )
            VALUES (
                %s, %s, %s, %s,
                %s, %s, %s, %s,
                %s, %s, %s, %s,
                %s, %s, %s, %s
            )
            """,
            lignes_offres
        )

        print("Offres importées :", len(lignes_offres))

    connexion.commit()

print("\n--- IMPORTATION TERMINÉE ---")
