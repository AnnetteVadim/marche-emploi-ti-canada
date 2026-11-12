from pathlib import Path
import pandas as pd

BASE_DIR = Path(__file__).resolve().parent.parent

fichier = (
    BASE_DIR / "data" / "processed"
    / "job_bank_ti_jan_sept2026.csv"
)

df = pd.read_csv(fichier, encoding="utf-8-sig")

print("\n--- INDICATEUR 1 : OFFRES PAR MOIS ---")
print(df["mois_source"].value_counts().sort_index())

print("\n--- INDICATEUR 2 : PROFESSIONS TI ---")
print(
    df.groupby("Code CNP 2021")
    .agg(
        nombre_offres=("ID WIC Lieu emploi", "count"),
        postes_vacants=("Nombre de postes vacants", "sum")
    )
    .sort_values("nombre_offres", ascending=False)
    .to_string()
)

print("\n--- INDICATEUR 3 : OFFRES PAR PROVINCE ---")
print(df["Provinces/Territoires"].value_counts())

#---------------------Ajout Temporaire ----------------------
print("\n--- CONTRÔLE DES POSTES VACANTS ---")

postes = pd.to_numeric(
    df["Nombre de postes vacants"],
    errors="coerce"
)

print("Type initial :", df["Nombre de postes vacants"].dtype)
print("Valeurs non numériques ou manquantes :", postes.isna().sum())
print("Total des postes vacants :", postes.sum())
print("Nombre de postes inférieur ou égal à zéro :", (postes <= 0).sum())
