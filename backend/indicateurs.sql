
-- PROJET DE SYNTHÈSE
-- Indicateurs du marché de l'emploi TI au Canada
-- Période : janvier à septembre 2026

-- 1. Indicateurs généraux
SELECT
    COUNT(*) AS nombre_offres,
    SUM(nombre_postes) AS postes_vacants,
    COUNT(DISTINCT code_cnp) AS nombre_professions
FROM offres_emploi;

-- 2. Évolution mensuelle
SELECT
    mois_source AS mois,
    COUNT(*) AS nombre_offres,
    SUM(nombre_postes) AS postes_vacants
FROM offres_emploi
GROUP BY mois_source
ORDER BY mois_source;

-- 3. Offres par profession
SELECT
    p.code_cnp,
    p.nom_profession,
    COUNT(*) AS nombre_offres,
    SUM(o.nombre_postes) AS postes_vacants
FROM offres_emploi o
JOIN professions p ON o.code_cnp = p.code_cnp
GROUP BY p.code_cnp, p.nom_profession
ORDER BY nombre_offres DESC;

-- 4. Répartition par province
SELECT
    r.province,
    COUNT(*) AS nombre_offres,
    SUM(o.nombre_postes) AS postes_vacants
FROM offres_emploi o
JOIN regions r ON o.id_region = r.id_region
GROUP BY r.province
ORDER BY nombre_offres DESC;

-- 5. Qualité des données salariales
SELECT
    statut_salaire,
    COUNT(*) AS nombre_offres,
    ROUND(AVG(salaire_horaire_estime), 2)
        AS salaire_horaire_moyen
FROM offres_emploi
GROUP BY statut_salaire
ORDER BY nombre_offres DESC;

-- 6. Salaires horaires estimés par profession
SELECT
    p.code_cnp,
    p.nom_profession,
    COUNT(*) AS offres_avec_salaire,
    ROUND(AVG(o.salaire_horaire_estime), 2)
        AS salaire_horaire_moyen
FROM offres_emploi o
JOIN professions p ON o.code_cnp = p.code_cnp
WHERE o.statut_salaire = 'horaire_exploitable'
  AND o.salaire_horaire_estime IS NOT NULL
GROUP BY p.code_cnp, p.nom_profession
ORDER BY salaire_horaire_moyen DESC;
