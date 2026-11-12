from pathlib import Path
import pandas as pd

BASE_DIR = Path(__file__).resolve().parent.parent
RAW_DIR = BASE_DIR / "data" / "raw"

fichier_fr = RAW_DIR / "job-bank-open-data-all-job-postings-fr-mars2026.csv"
fichier_en = RAW_DIR / "job-bank-open-data-all-job-postings-en-apr2026.csv"

df_fr = pd.read_csv(
    fichier_fr, encoding="utf-16", sep=None,
    engine="python", nrows=5
)

df_en = pd.read_csv(
    fichier_en, encoding="utf-16", sep=None,
    engine="python", nrows=5
)

print("\n--- COLONNES FRANÇAISES ---")
for colonne in df_fr.columns:
    print(colonne)

print("\n--- COLONNES ANGLAISES ---")
for colonne in df_en.columns:
    print(colonne)

print("\n--- COMPARAISON FRANÇAIS / ANGLAIS ---")

for i, (fr, en) in enumerate(zip(df_fr.columns, df_en.columns), start=1):
    print(f"{i}. {fr}  -->  {en}")

print("\nNombre de colonnes françaises :", len(df_fr.columns))
print("Nombre de colonnes anglaises :", len(df_en.columns))