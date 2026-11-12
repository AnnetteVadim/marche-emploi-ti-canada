from pathlib import Path
import pandas as pd
import numpy as np

# 1. CHEMINS DU PROJET
BASE_DIR = Path(__file__).resolve().parent.parent
RAW_DIR = BASE_DIR / "data" / "raw"
PROCESSED_DIR = BASE_DIR / "data" / "processed"
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

# 2. FICHIERS MENSUELS
fichiers = {
    "2026-01": "job-bank-open-data-all-job-postings-fr-jan2026.csv",
    "2026-02": "job-bank-open-data-all-job-postings-fr-fev2026.csv",
    "2026-03": "job-bank-open-data-all-job-postings-fr-mars2026.csv",
    "2026-04": "job-bank-open-data-all-job-postings-en-apr2026.csv",
    "2026-05": "job-bank-open-data-all-job-postings-fr-mai2026.csv",
    "2026-06": "job-bank-open-data-all-job-postings-fr-juin2026.csv",
    "2026-07": "job-bank-open-data-all-job-postings-fr-juillet2026.csv",
    "2026-08": "job-bank-open-data-all-job-postings-fr-aout2026.csv",
    "2026-09": "job-bank-open-data-all-job-postings-fr-sept2026.csv",
}

# 3. PROFESSIONS TI RETENUES
codes_ti = {
    20012, 21211, 21220, 21221, 21222,
    21223, 21230, 21231, 21232, 21233,
    21234, 21311, 22220, 22221, 22222,
}

# 4. COLONNES UTILES
colonnes_utiles = [
    "ID WIC Lieu emploi",
    "Appellation d'emploi",
    "Code CNP 2021",
    "Code CNP21 nom",
    "Date initiale affichage de l'offre d'emploi",
    "Nombre de postes vacants",
    "Provinces/Territoires",
    "Ville",
    "Région économique",
    "Niveau d'expérience",
    "Éducation Niveau d'études",
    "Période d'emploi",
    "Conditions d'emploi",
    "Salaire par",
    "Salaire Minimum",
    "Salaire Maximum",
]

# 5. COLONNES FRANÇAISES DE RÉFÉRENCE
fichier_reference = RAW_DIR / "job-bank-open-data-all-job-postings-fr-mars2026.csv"
colonnes_fr = pd.read_csv(
    fichier_reference, encoding="utf-16", sep=None, engine="python", nrows=0
).columns.tolist()

traduction_provinces = {
    "British Columbia": "Colombie-Britannique",
    "New Brunswick": "Nouveau-Brunswick",
    "Nova Scotia": "Nouvelle-Écosse",
    "Newfoundland and Labrador": "Terre-Neuve-et-Labrador",
    "Prince Edward Island": "Île-du-Prince-Édouard",
    "Northwest Territories": "Territoires du Nord-Ouest",
    "Quebec": "Québec",
}

# 6. TRAITEMENT DES NEUF MOIS
resultats = []
for mois, nom_fichier in fichiers.items():
    chemin = RAW_DIR / nom_fichier
    print(f"\n--- TRAITEMENT DE {mois} ---")
    if not chemin.exists():
        raise FileNotFoundError(f"Fichier introuvable : {chemin}")

    df = pd.read_csv(chemin, encoding="utf-16", sep=None, engine="python")
    print("Offres tous secteurs :", len(df))

    if mois == "2026-04":
        if len(df.columns) != len(colonnes_fr):
            raise ValueError("Le fichier anglais d'avril n'a pas le même nombre de colonnes.")
        # L'ordre des 65 colonnes a été vérifié par comparaison avec mars.
        df.columns = colonnes_fr
        df["Salaire par"] = df["Salaire par"].replace({
            "Hour": "Heure", "Hourly": "Heure",
            "Year": "Année", "Annually": "Année",
            "Month": "Mois", "Monthly": "Mois",
            "Day": "Jour", "Daily": "Jour",
            "Week": "Semaine", "Weekly": "Semaine",
            "Biweekly": "Deux semaines", "Bi-weekly": "Deux semaines",
            "Two weeks": "Deux semaines",
        })
        print("Colonnes d'avril harmonisées en français")
        print("Unités salariales d'avril :")
        print(df["Salaire par"].value_counts(dropna=False))

    df["Code CNP 2021"] = pd.to_numeric(df["Code CNP 2021"], errors="coerce")
    df_ti = df.loc[df["Code CNP 2021"].isin(codes_ti), colonnes_utiles].copy()
    df_ti = df_ti.drop_duplicates()
    df_ti["Code CNP 2021"] = df_ti["Code CNP 2021"].astype("Int64")

    df_ti["Date initiale affichage de l'offre d'emploi"] = pd.to_datetime(
        df_ti["Date initiale affichage de l'offre d'emploi"], errors="coerce"
    )
    for colonne in ["Salaire Minimum", "Salaire Maximum"]:
        df_ti[colonne] = pd.to_numeric(df_ti[colonne], errors="coerce")

    horaire = df_ti["Salaire par"] == "Heure"
    # Seuil de 200 $/h : règle provisoire, et non limite officielle.
    valide = (
        horaire
        & (df_ti["Salaire Minimum"] > 0)
        & (df_ti["Salaire Maximum"] <= 200)
        & (df_ti["Salaire Minimum"] <= df_ti["Salaire Maximum"])
    )
    df_ti["statut_salaire"] = np.select(
        [valide, horaire & ~valide],
        ["horaire_exploitable", "horaire_suspect"],
        default="autre_unite",
    )
    df_ti["salaire_horaire_estime"] = np.where(
        valide,
        (df_ti["Salaire Minimum"] + df_ti["Salaire Maximum"]) / 2,
        np.nan,
    )

    # Harmonisation des provinces : dans la boucle, avant la consolidation.
    df_ti["Provinces/Territoires"] = (
        df_ti["Provinces/Territoires"].replace(traduction_provinces)
    )
    df_ti["mois_source"] = mois

    print("Offres TI :", len(df_ti))
    print("Salaires horaires exploitables :", int(valide.sum()))
    print("Dates invalides :", df_ti["Date initiale affichage de l'offre d'emploi"].isna().sum())
    resultats.append(df_ti)

# 7. REGROUPEMENT DES NEUF MOIS
df_global = pd.concat(resultats, ignore_index=True)
chemin_sortie = PROCESSED_DIR / "job_bank_ti_jan_sept2026.csv"
df_global.to_csv(chemin_sortie, index=False, encoding="utf-8-sig")
print("\n--- RÉSULTAT GLOBAL ---")
print("Nombre total de lignes :", len(df_global))
print("Nombre de colonnes :", len(df_global.columns))
print("\nOffres TI par mois :")
print(df_global["mois_source"].value_counts().sort_index())
print("\nFichier enregistré :", chemin_sortie)

# 8. VÉRIFICATION DES IDENTIFIANTS ENTRE LES MOIS
print("\n--- VÉRIFICATION DES OFFRES ENTRE LES MOIS ---")
colonne_id = "ID WIC Lieu emploi"
print("Nombre d'identifiants uniques :", df_global[colonne_id].nunique())
print("Identifiants manquants :", df_global[colonne_id].isna().sum())
print("Identifiants répétés :", df_global[colonne_id].dropna().duplicated().sum())
frequence = df_global.groupby(colonne_id)["mois_source"].nunique()
print("\nNombre d'offres présentes dans :")
print(frequence.value_counts().sort_index())
ids_repetes = frequence[frequence > 1].index
print("\nExemples d'offres présentes sur plusieurs mois :")
print(
    df_global.loc[
        df_global[colonne_id].isin(ids_repetes),
        [colonne_id, "Appellation d'emploi", "mois_source"],
    ].sort_values([colonne_id, "mois_source"]).head(15).to_string(index=False)
)

# 9. ANALYSE DES OFFRES TI PAR PROVINCE
print("\n--- ANALYSE DES OFFRES TI PAR PROVINCE ---")
offres_provinces = df_global.groupby("Provinces/Territoires").size().sort_values(ascending=False)
print("\nNombre total d'offres TI par province :")
print(offres_provinces.to_string())
evolution_provinces = pd.crosstab(df_global["Provinces/Territoires"], df_global["mois_source"])
print("\nÉvolution mensuelle par province :")
print(evolution_provinces.to_string())
print("\nProvinces manquantes :", df_global["Provinces/Territoires"].isna().sum())

# 10. VÉRIFICATION DES DATES PAR MOIS
print("\n--- VÉRIFICATION DES DATES PAR MOIS ---")
print(
    df_global.groupby("mois_source")["Date initiale affichage de l'offre d'emploi"]
    .agg(["min", "max"]).to_string()
)
print("\n--- TRAITEMENT TERMINÉ ---")
