
-- TABLE 1 : PROFESSIONS TI
CREATE TABLE IF NOT EXISTS professions (
    code_cnp INTEGER PRIMARY KEY,
    nom_profession VARCHAR(255) NOT NULL
);

-- TABLE 2 : REGIONS GEOGRAPHIQUES
CREATE TABLE IF NOT EXISTS regions (
    id_region INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    province VARCHAR(100) NOT NULL,
    ville VARCHAR(255),
    region_economique VARCHAR(255)
);

-- TABLE 3 : OFFRES D'EMPLOI TI
CREATE TABLE IF NOT EXISTS offres_emploi (
    id_offre BIGINT PRIMARY KEY,
    code_cnp INTEGER REFERENCES professions(code_cnp),
    id_region INTEGER REFERENCES regions(id_region),
    appellation_emploi TEXT,
    date_affichage DATE,
    nombre_postes INTEGER,
    niveau_experience TEXT,
    niveau_etudes TEXT,
    periode_emploi TEXT,
    conditions_emploi TEXT,
    salaire_par VARCHAR(50),
    salaire_minimum NUMERIC(12, 2),
    salaire_maximum NUMERIC(12, 2),
    statut_salaire VARCHAR(30),
    salaire_horaire_estime NUMERIC(12, 2),
    mois_source CHAR(7)
);
