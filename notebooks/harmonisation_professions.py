
from pathlib import Path
import pandas as pd

# Chemins du projet
BASE_DIR = Path(__file__).resolve().parent.parent
PROCESSED_DIR = BASE_DIR / "data" / "processed"

fichier_entree = PROCESSED_DIR / "job_bank_ti_jan_sept2026.csv"
fichier_sortie = PROCESSED_DIR / "job_bank_ti_harmonise.csv"

# Lecture des données
df = pd.read_csv(fichier_entree, encoding="utf-8-sig")

# Les autres mois servent de référence pour les noms français
df_fr = df[df["mois_source"] != "2026-04"]

# Un intitulé français pour chaque code CNP
noms_fr = (
    df_fr.groupby("Code CNP 2021")["Code CNP21 nom"]
    .first()
    .to_dict()
)

# Vérifier que tous les codes possèdent un nom français
codes_sans_nom = set(df["Code CNP 2021"]) - set(noms_fr)

if codes_sans_nom:
    raise ValueError(
        f"Codes CNP sans intitulé français : {codes_sans_nom}"
    )

# Harmoniser les noms pour tous les mois
df["Code CNP21 nom"] = df["Code CNP 2021"].map(noms_fr)

# Enregistrer un nouveau fichier sans écraser l'original
df.to_csv(
    fichier_sortie,
    index=False,
    encoding="utf-8-sig"
)

# Vérifications
print("\n--- HARMONISATION DES PROFESSIONS ---")
print("Nombre total d'offres :", len(df))
print("Nombre de professions :", len(noms_fr))
print("Intitulés manquants :", df["Code CNP21 nom"].isna().sum())

print("\nNombre de noms différents par code CNP :")
print(
    df.groupby("Code CNP 2021")["Code CNP21 nom"]
    .nunique()
    .to_string()
)

print("\nFichier enregistré :", fichier_sortie)
print("\n--- HARMONISATION TERMINÉE ---")
