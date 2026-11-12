import pandas as pd

# Chemin vers le fichier brut du Guichet-Emplois
fichier = "../data/raw/job-bank-open-data-all-job-postings-fr-juin2026.csv"

# Charger les données
df = pd.read_csv(
    fichier,
    encoding="utf-16",
    sep=None,
    engine="python"
)

# Afficher les premières lignes
print(df.head())

# Afficher les dimensions
print("\nNombre de lignes et de colonnes :")
print(df.shape)

# Afficher les noms des colonnes
print("\nColonnes disponibles :")
print(df.columns.tolist())

# Quelques statistiques sur les données
print("\nNombre total de postes vacants :")
print(df["Nombre de postes vacants"].sum())

print("\nNombre de professions CNP 2021 différentes :")
print(df["Code CNP 2021"].nunique())

print("\nExemples de professions :")
print(
    df[["Code CNP 2021", "Code CNP21 nom"]]
    .drop_duplicates()
    .head(30)
    .to_string(index=False)
)

print("\nNombre d'offres par province/territoire :")
print(df["Provinces/Territoires"].value_counts())


# Rechercher les professions potentiellement liées aux TI
mots_cles_ti = (
    "informatique|logiciel|données|programmeur|"
    "développeur|réseau|cybersécurité|technologies de l'information"
)

professions_ti = df[
    df["Code CNP21 nom"]
    .fillna("")
    .str.contains(mots_cles_ti, case=False, regex=True)
]

print("\nNombre d'offres potentiellement liées aux TI :")
print(len(professions_ti))

print("\nProfessions TI trouvées :")
print(
    professions_ti[
        ["Code CNP 2021", "Code CNP21 nom"]
    ]
    .drop_duplicates()
    .sort_values("Code CNP 2021")
    .to_string(index=False)
)


# Liste des codes CNP 2021 retenus pour les professions TI
codes_ti = [
    20012,
    21211,
    21220,
    21221,
    21222,
    21223,
    21230,
    21231,
    21232,
    21233,
    21234,
    21311,
    22220,
    22221,
    22222
]

# Filtrer uniquement les offres correspondant aux professions TI
df_ti = df[df["Code CNP 2021"].isin(codes_ti)].copy()

print("\n--- DATASET TI ---")

print("\nNombre d'offres TI :")
print(len(df_ti))

print("\nNombre total de postes vacants TI :")
print(df_ti["Nombre de postes vacants"].sum())

print("\nNombre d'offres par profession TI :")
print(
    df_ti["Code CNP21 nom"]
    .value_counts()
    .to_string()
)

# Colonnes utiles pour l'analyse du marché TI
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
    "Salaire Maximum"
]

# Conserver uniquement les variables pertinentes
df_ti_clean = df_ti[colonnes_utiles].copy()

# Supprimer les doublons éventuels
df_ti_clean = df_ti_clean.drop_duplicates()

# Sauvegarder le premier dataset TI préparé
df_ti_clean.to_csv(
    "../data/processed/job_bank_ti_juin2026.csv",
    index=False,
    encoding="utf-8-sig"
)
#-------------------------------------Mardi 13 Oct -------------------------------
print("\nDataset TI nettoyé enregistré.")
print("Dimensions :", df_ti_clean.shape)

print("\n--- CONTRÔLE DE QUALITÉ DES DONNÉES TI ---")

print("\nValeurs manquantes par colonne :")
print(df_ti_clean.isna().sum().to_string())

print("\nNombre de lignes entièrement identiques :")
print(df_ti_clean.duplicated().sum())

print("\nRépartition des unités de salaire :")
print(df_ti_clean["Salaire par"].value_counts(dropna=False))

print("\nExemples de salaires :")
print(
    df_ti_clean[
        ["Salaire par", "Salaire Minimum", "Salaire Maximum"]
    ].head(15).to_string(index=False)
)

print("\n--- VÉRIFICATION DES DATES ---")

# Convertir les dates en format datetime
dates = pd.to_datetime(
    df_ti_clean["Date initiale affichage de l'offre d'emploi"],
    errors="coerce"
)

print("Dates non reconnues :", dates.isna().sum())
print("Date la plus ancienne :", dates.min())
print("Date la plus récente :", dates.max())

print("\n--- VÉRIFICATION DES SALAIRES ---")

# Vérifier les salaires minimums supérieurs aux maximums
salaires_incoherents = df_ti_clean[
    df_ti_clean["Salaire Minimum"] >
    df_ti_clean["Salaire Maximum"]
]

print("Salaires minimums supérieurs aux maximums :",
      len(salaires_incoherents))

# Vérifier les salaires nuls ou négatifs
print(
    "Salaires minimums nuls ou négatifs :",
    (df_ti_clean["Salaire Minimum"] <= 0).sum()
)

print(
    "Salaires maximums nuls ou négatifs :",
    (df_ti_clean["Salaire Maximum"] <= 0).sum()
)

print("\n--- VÉRIFICATION DES IDENTIFIANTS ---")

print(
    "Identifiants d'offres répétés :",
    df_ti_clean["ID WIC Lieu emploi"].duplicated().sum()
)

print("\n--- ANALYSE DES SALAIRES HORAIRES ---")

# Sélectionner les offres avec salaire horaire
df_horaire = df_ti_clean[
    df_ti_clean["Salaire par"] == "Heure"
].copy()

# Calculer le milieu de la fourchette salariale
df_horaire["Salaire horaire moyen proposé"] = (
    df_horaire["Salaire Minimum"] +
    df_horaire["Salaire Maximum"]
) / 2

print("Nombre d'offres avec salaire horaire :",
      len(df_horaire))

print("\nSalaire horaire proposé (moyenne des milieux de fourchettes) :")
print(
    round(
        df_horaire["Salaire horaire moyen proposé"].mean(),
        2
    )
)

print("\nSalaires horaires par profession :")
print(
    df_horaire.groupby("Code CNP21 nom")[
        "Salaire horaire moyen proposé"
    ]
    .agg(["count", "mean"])
    .round(2)
    .sort_values("mean", ascending=False)
    .to_string()
)

print("\n--- INVESTIGATION DES SALAIRES EXTRÊMES ---")

# Afficher les 20 salaires horaires les plus élevés
colonnes_verification = [
    "ID WIC Lieu emploi",
    "Appellation d'emploi",
    "Code CNP21 nom",
    "Salaire par",
    "Salaire Minimum",
    "Salaire Maximum",
    "Salaire horaire moyen proposé"
]

print(
    df_horaire.nlargest(
        20, "Salaire horaire moyen proposé"
    )[colonnes_verification].to_string(index=False)
)

print("\nNombre d'offres avec salaire horaire supérieur à 200 $ :")

print(
    (
        df_horaire["Salaire horaire moyen proposé"] > 200
    ).sum()
)

print("\nStatistiques des salaires horaires :")

print(
    df_horaire["Salaire horaire moyen proposé"]
    .describe(percentiles=[0.25, 0.5, 0.75, 0.95, 0.99])
)

print("\n--- SALAIRES HORAIRES APRÈS FILTRAGE PROVISOIRE ---")

# Conserver uniquement les offres avec salaire horaire
# positif et maximum inférieur ou égal à 200 $
df_horaire_valide = df_horaire[
    (df_horaire["Salaire Minimum"] > 0) &
    (df_horaire["Salaire Maximum"] <= 200)
].copy()

print("Offres horaires conservées :", len(df_horaire_valide))

print("Offres horaires mises à l'écart :",
      len(df_horaire) - len(df_horaire_valide))

print("\nMoyenne des milieux de fourchettes :")
print(
    round(
        df_horaire_valide["Salaire horaire moyen proposé"].mean(),
        2
    )
)

print("\nMédiane des milieux de fourchettes :")
print(
    round(
        df_horaire_valide["Salaire horaire moyen proposé"].median(),
        2
    )
)

import numpy as np

print("\n--- CRÉATION DU DATASET ENRICHI ---")

df_final = df_ti_clean.copy()

# Convertir les codes CNP en entiers
df_final["Code CNP 2021"] = (
    pd.to_numeric(
        df_final["Code CNP 2021"],
        errors="coerce"
    ).astype("Int64")
)

# Uniformiser les dates
df_final["Date initiale affichage de l'offre d'emploi"] = (
    pd.to_datetime(
        df_final["Date initiale affichage de l'offre d'emploi"]
    ).dt.strftime("%Y-%m-%d")
)

# Identifier les offres avec salaire horaire exploitable
horaire = df_final["Salaire par"] == "Heure"

valide = (
    horaire
    & (df_final["Salaire Minimum"] > 0)
    & (df_final["Salaire Maximum"] <= 200)
    & (df_final["Salaire Minimum"] <= df_final["Salaire Maximum"])
)

suspect = horaire & ~valide

# Ajouter le statut salarial
df_final["statut_salaire"] = np.select(
    [valide, suspect],
    ["horaire_exploitable", "horaire_suspect"],
    default="autre_unite"
)

# Créer l'indicateur salarial
df_final["salaire_horaire_estime"] = np.where(
    valide,
    (
        df_final["Salaire Minimum"]
        + df_final["Salaire Maximum"]
    ) / 2,
    np.nan
)

# Enregistrer le fichier enrichi
df_final.to_csv(
    "../data/processed/job_bank_ti_juin2026_enrichi.csv",
    index=False,
    encoding="utf-8-sig"
)

print("Dimensions :", df_final.shape)

print("\nStatuts des salaires :")
print(df_final["statut_salaire"].value_counts())

print("\nMoyenne horaire exploitable :")
print(round(df_final["salaire_horaire_estime"].mean(), 2))

print("\nFichier enrichi enregistré avec succès.")