"""
Tests de l'API FastAPI.

Ces tests interrogent la vraie base PostgreSQL : Docker doit être
démarré et les données importées avant de les lancer.

Lancement, à partir de la racine du projet :
    python -m pytest -v
"""

import pytest
from fastapi.testclient import TestClient

from backend.main import app

client = TestClient(app)

# Valeurs attendues, vérifiées à partir du fichier
# data/processed/job_bank_ti_harmonise.csv
TOTAL_OFFRES = 11380
TOTAL_POSTES = 12214
NOMBRE_PROFESSIONS = 15
NOMBRE_PROVINCES = 13
OFFRES_PAR_MOIS = {
    "2026-01": 1422,
    "2026-02": 1312,
    "2026-03": 1497,
    "2026-04": 1371,
    "2026-05": 1053,
    "2026-06": 1252,
    "2026-07": 1295,
    "2026-08": 1043,
    "2026-09": 1135,
}
OFFRES_QUEBEC = 1776
OFFRES_SALAIRE_EXPLOITABLE = 6795


# ============================================================
# 1. FONCTIONNEMENT GÉNÉRAL
# ============================================================

def test_accueil():
    reponse = client.get("/")
    assert reponse.status_code == 200
    assert "message" in reponse.json()


def test_connexion_base_de_donnees():
    reponse = client.get("/test-database")
    assert reponse.status_code == 200
    assert reponse.json()["database"] == "emploi_ti"


# ============================================================
# 2. EXACTITUDE DES INDICATEURS (SANS FILTRE)
# ============================================================

def test_statistiques_generales():
    donnees = client.get("/statistiques/generales").json()
    assert donnees["nombre_offres"] == TOTAL_OFFRES
    assert donnees["postes_vacants"] == TOTAL_POSTES
    assert donnees["nombre_professions"] == NOMBRE_PROFESSIONS


def test_total_offres():
    donnees = client.get("/statistiques/total-offres").json()
    assert donnees["total_offres"] == TOTAL_OFFRES


def test_offres_par_mois():
    donnees = client.get("/statistiques/mensuelles").json()
    resultat = {ligne["mois"]: ligne["nombre_offres"] for ligne in donnees}
    assert resultat == OFFRES_PAR_MOIS


def test_postes_vacants_superieurs_ou_egaux_aux_offres():
    # Une offre annonce au moins un poste.
    for ligne in client.get("/statistiques/mensuelles").json():
        assert ligne["postes_vacants"] >= ligne["nombre_offres"]


def test_professions_couvrent_toutes_les_offres():
    donnees = client.get("/statistiques/professions").json()
    assert len(donnees) == NOMBRE_PROFESSIONS
    assert sum(ligne["nombre_offres"] for ligne in donnees) == TOTAL_OFFRES


def test_provinces_couvrent_toutes_les_offres():
    donnees = client.get("/statistiques/provinces").json()
    assert len(donnees) == NOMBRE_PROVINCES
    assert sum(ligne["nombre_offres"] for ligne in donnees) == TOTAL_OFFRES


def test_qualite_des_salaires():
    donnees = client.get("/statistiques/qualite-salaires").json()
    assert sum(ligne["nombre_offres"] for ligne in donnees) == TOTAL_OFFRES

    exploitables = next(
        ligne for ligne in donnees
        if ligne["statut_salaire"] == "horaire_exploitable"
    )
    assert exploitables["nombre_offres"] == OFFRES_SALAIRE_EXPLOITABLE


def test_salaires_positifs():
    donnees = client.get("/statistiques/salaires-professions").json()
    assert len(donnees) > 0
    for ligne in donnees:
        assert ligne["salaire_horaire_moyen"] > 0


# ============================================================
# 3. FILTRES PAR PROVINCE ET PAR MOIS
# ============================================================

def test_filtre_province():
    donnees = client.get(
        "/statistiques/generales", params={"province": "Québec"}
    ).json()
    assert donnees["nombre_offres"] == OFFRES_QUEBEC


@pytest.mark.parametrize("mois, attendu", OFFRES_PAR_MOIS.items())
def test_filtre_mois(mois, attendu):
    donnees = client.get(
        "/statistiques/generales", params={"mois": mois}
    ).json()
    assert donnees["nombre_offres"] == attendu


def test_filtres_combines_coherents():
    # La somme des mois pour le Québec doit donner le total du Québec.
    total = 0
    for mois in OFFRES_PAR_MOIS:
        donnees = client.get(
            "/statistiques/generales",
            params={"province": "Québec", "mois": mois},
        ).json()
        total += donnees["nombre_offres"]
    assert total == OFFRES_QUEBEC


def test_province_inconnue_renvoie_zero():
    donnees = client.get(
        "/statistiques/generales", params={"province": "Atlantide"}
    ).json()
    assert donnees["nombre_offres"] == 0


# ============================================================
# 4. VALIDATION DES PARAMÈTRES
# ============================================================

@pytest.mark.parametrize("mois", ["2026-13", "2025-01", "mars", "2026-1"])
def test_mois_invalide_refuse(mois):
    reponse = client.get("/statistiques/generales", params={"mois": mois})
    assert reponse.status_code == 422
