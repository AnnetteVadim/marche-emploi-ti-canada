import { useEffect, useState } from 'react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList
} from 'recharts'

import './App.css'

const API_URL = 'http://127.0.0.1:8000'

// Palette volontairement sobre : une seule couleur pour les données,
// du gris pour le reste.
const COULEURS = {
  donnees: '#3d6a94',
  texte: '#333333',
  texteSecondaire: '#666666',
  grille: '#e5e5e5',
  bordure: '#cccccc',
  donneesSecondaires: '#a9bdd1',
  survol: '#f2f2f2'
}

const MOIS = [
  { valeur: '2026-01', nom: 'Janvier 2026', court: 'Jan' },
  { valeur: '2026-02', nom: 'Février 2026', court: 'Fév' },
  { valeur: '2026-03', nom: 'Mars 2026', court: 'Mar' },
  { valeur: '2026-04', nom: 'Avril 2026', court: 'Avr' },
  { valeur: '2026-05', nom: 'Mai 2026', court: 'Mai' },
  { valeur: '2026-06', nom: 'Juin 2026', court: 'Juin' },
  { valeur: '2026-07', nom: 'Juillet 2026', court: 'Juil' },
  { valeur: '2026-08', nom: 'Août 2026', court: 'Août' },
  { valeur: '2026-09', nom: 'Septembre 2026', court: 'Sep' }
]

const afficherMois = (valeur) => {
  return MOIS.find((mois) => mois.valeur === valeur)?.court
    || String(valeur)
}

const nomsCourts = {
  '21222': 'Spécialistes TI',
  '21232': 'Développeurs logiciels',
  '21231': 'Ingénieurs logiciels',
  '20012': 'Gestionnaires TI',
  '22221': 'Soutien aux utilisateurs',
  '21234': 'Développeurs Web',
  '21211': 'Scientifiques de données',
  '21221': 'Systèmes commerciaux',
  '22220': 'Techniciens réseau/Web',
  '21220': 'Cybersécurité',
  '21223': 'Analystes de bases de données',
  '21311': 'Ingénieurs en informatique',
  '21230': 'Développeurs de systèmes',
  '21233': 'Concepteurs Web',
  '22222': 'Évaluateurs de systèmes'
}

const afficherNombre = (valeur) =>
  Number(valeur).toLocaleString('fr-CA')

const afficherSalaire = (valeur) =>
  `${Number(valeur).toLocaleString('fr-CA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })} $/h`

const styleSelect = {
  padding: '12px 16px',
  borderRadius: 4,
  border: `1px solid ${COULEURS.bordure}`,
  backgroundColor: 'white',
  color: COULEURS.texte,
  fontSize: 15,
  minWidth: 250,
  maxWidth: '100%'
}

const styleBouton = {
  backgroundColor: 'white',
  color: COULEURS.texte,
  border: `1px solid ${COULEURS.bordure}`,
  padding: '10px 18px',
  borderRadius: 4,
  fontSize: 14,
  cursor: 'pointer'
}

// Largeur de la fenêtre, pour adapter les graphiques sur téléphone.
function useLargeurEcran() {
  const [largeur, setLargeur] = useState(window.innerWidth)

  useEffect(() => {
    const surRedimensionnement = () => setLargeur(window.innerWidth)
    window.addEventListener('resize', surRedimensionnement)
    return () => window.removeEventListener('resize', surRedimensionnement)
  }, [])

  return largeur
}

function App() {
  // ==========================================================
  // 1. ÉTATS DE L'APPLICATION
  // ==========================================================

  const [statistiques, setStatistiques] = useState(null)
  const [donneesMensuelles, setDonneesMensuelles] = useState([])
  const [donneesProfessions, setDonneesProfessions] = useState([])
  const [donneesProvinces, setDonneesProvinces] = useState([])
  const [donneesSalaires, setDonneesSalaires] = useState([])
  const [qualiteSalaires, setQualiteSalaires] = useState([])

  const [listeProvinces, setListeProvinces] = useState([])

  // Chaîne vide = aucun filtre sur cette dimension.
  const [provinceSelectionnee, setProvinceSelectionnee] = useState('')
  const [moisSelectionne, setMoisSelectionne] = useState('')

  const [afficherToutes, setAfficherToutes] = useState(false)
  const [afficherTousSalaires, setAfficherTousSalaires] = useState(false)

  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState('')
  const [erreurProvinces, setErreurProvinces] = useState('')

  const estMobile = useLargeurEcran() < 640
  const largeurEtiquettes = estMobile ? 120 : 185
  const tailleEtiquettes = estMobile ? 10 : 12

  // ==========================================================
  // 2. CHARGER LA LISTE COMPLÈTE DES PROVINCES
  // ==========================================================

  useEffect(() => {
    const controleur = new AbortController()

    async function chargerListeProvinces() {
      try {
        const reponse = await fetch(
          `${API_URL}/statistiques/provinces`,
          { signal: controleur.signal }
        )

        if (!reponse.ok) {
          throw new Error('Impossible de charger les provinces')
        }

        const donnees = await reponse.json()

        if (!controleur.signal.aborted) {
          setListeProvinces(
            [...donnees].sort((a, b) =>
              a.province.localeCompare(b.province, 'fr')
            )
          )
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error(error)
          setErreurProvinces(error.message)
        }
      }
    }

    chargerListeProvinces()

    return () => controleur.abort()
  }, [])

  // ==========================================================
  // 3. CHARGER LES DONNÉES SELON LES DEUX FILTRES
  // ==========================================================

  useEffect(() => {
    const controleur = new AbortController()
    const parametres = new URLSearchParams()

    if (provinceSelectionnee) {
      parametres.set('province', provinceSelectionnee)
    }

    if (moisSelectionne) {
      parametres.set('mois', moisSelectionne)
    }

    const suffixe = parametres.toString()
      ? `?${parametres.toString()}`
      : ''

    async function recupererDonnees(endpoint) {
      const reponse = await fetch(
        `${API_URL}/statistiques/${endpoint}${suffixe}`,
        { signal: controleur.signal }
      )

      if (!reponse.ok) {
        throw new Error(
          `Erreur HTTP ${reponse.status} : ${endpoint}`
        )
      }

      return reponse.json()
    }

    async function chargerTableauDeBord() {
      setChargement(true)
      setErreur('')

      // Éviter d'afficher les données de l'ancienne sélection.
      setStatistiques(null)
      setDonneesMensuelles([])
      setDonneesProfessions([])
      setDonneesProvinces([])
      setDonneesSalaires([])
      setQualiteSalaires([])

      try {
        const [
          generales,
          mensuelles,
          professions,
          provinces,
          salaires,
          qualite
        ] = await Promise.all([
          recupererDonnees('generales'),
          recupererDonnees('mensuelles'),
          recupererDonnees('professions'),
          recupererDonnees('provinces'),
          recupererDonnees('salaires-professions'),
          recupererDonnees('qualite-salaires')
        ])

        if (controleur.signal.aborted) return

        setStatistiques(generales)
        setDonneesMensuelles(mensuelles)
        setQualiteSalaires(qualite)

        setDonneesProfessions(
          professions.map((profession) => ({
            ...profession,
            nom_court:
              nomsCourts[String(profession.code_cnp)] ||
              profession.nom_profession
          }))
        )

        setDonneesProvinces(
          [...provinces].sort(
            (a, b) => b.nombre_offres - a.nombre_offres
          )
        )

        setDonneesSalaires(
          salaires
            .map((profession) => ({
              ...profession,
              nom_court:
                nomsCourts[String(profession.code_cnp)] ||
                profession.nom_profession
            }))
            .sort(
              (a, b) =>
                b.salaire_horaire_moyen -
                a.salaire_horaire_moyen
            )
        )
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error(error)
          setErreur(
            'Impossible de charger les données du tableau de bord. ' +
            'Vérifie que FastAPI fonctionne et que les filtres sont valides.'
          )
        }
      } finally {
        if (!controleur.signal.aborted) {
          setChargement(false)
        }
      }
    }

    chargerTableauDeBord()

    return () => controleur.abort()
  }, [provinceSelectionnee, moisSelectionne])

  // ==========================================================
  // 4. PRÉPARER LES DONNÉES DES GRAPHIQUES
  // ==========================================================

  const professionsTriees = [...donneesProfessions].sort(
    (a, b) => b.nombre_offres - a.nombre_offres
  )

  const professionsAffichees = afficherToutes
    ? professionsTriees
    : professionsTriees.slice(0, 10)

  const salairesAffiches = afficherTousSalaires
    ? donneesSalaires
    : donneesSalaires.slice(0, 10)

  const totalOffresSalaires = qualiteSalaires.reduce(
    (total, ligne) => total + ligne.nombre_offres,
    0
  )

  const offresSalaireExploitable =
    qualiteSalaires.find(
      (ligne) => ligne.statut_salaire === 'horaire_exploitable'
    )?.nombre_offres || 0

  const tauxSalairesExploitables = totalOffresSalaires
    ? Math.round(
        (offresSalaireExploitable / totalOffresSalaires) * 100
      )
    : null

  const nomTerritoire = provinceSelectionnee || 'Canada'

  const nomMois = MOIS.find(
    (mois) => mois.valeur === moisSelectionne
  )?.nom

  const periodeAnalysee = nomMois || 'Janvier à septembre 2026'

  const filtresActifs = Boolean(
    provinceSelectionnee || moisSelectionne
  )

  const reinitialiserFiltres = () => {
    setProvinceSelectionnee('')
    setMoisSelectionne('')
  }

  // ==========================================================
  // 5. INTERFACE DU TABLEAU DE BORD
  // ==========================================================

  return (
    <main>
      <h1>Marché de l'emploi TI au Canada</h1>

      <p>
        Tableau de bord d'analyse des offres d'emploi
        de janvier à septembre 2026, pensé pour aider les
        finissants en informatique à mieux comprendre le
        marché avant de chercher un premier emploi.
      </p>

      {/* FILTRES INTERACTIFS */}

      <section
        className="graphique"
        style={{ marginBottom: 24 }}
      >
        <h2>Explorer les données</h2>

        <p>
          Sélectionnez une province ou un territoire et
          une période pour actualiser les indicateurs
          et les graphiques.
        </p>

        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: 16,
            flexWrap: 'wrap'
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8
            }}
          >
            <label
              htmlFor="filtre-province"
              style={{ fontWeight: 600 }}
            >
              Province ou territoire :
            </label>

            <select
              id="filtre-province"
              value={provinceSelectionnee}
              onChange={(event) =>
                setProvinceSelectionnee(event.target.value)
              }
              style={styleSelect}
            >
              <option value="">
                Toutes les provinces (Canada)
              </option>

              {listeProvinces.map((province) => (
                <option
                  key={province.province}
                  value={province.province}
                >
                  {province.province}
                </option>
              ))}
            </select>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8
            }}
          >
            <label
              htmlFor="filtre-mois"
              style={{ fontWeight: 600 }}
            >
              Mois :
            </label>

            <select
              id="filtre-mois"
              value={moisSelectionne}
              onChange={(event) =>
                setMoisSelectionne(event.target.value)
              }
              style={styleSelect}
            >
              <option value="">
                Tous les mois (janv. à sept. 2026)
              </option>

              {MOIS.map((mois) => (
                <option
                  key={mois.valeur}
                  value={mois.valeur}
                >
                  {mois.nom}
                </option>
              ))}
            </select>
          </div>

          {filtresActifs && (
            <button
              type="button"
              onClick={reinitialiserFiltres}
              style={styleBouton}
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>

        <p
          style={{
            marginTop: 16,
            fontSize: 14,
            color: COULEURS.texteSecondaire
          }}
        >
          Zone analysée : <strong>{nomTerritoire}</strong>
          {' | '}
          Période : <strong>{periodeAnalysee}</strong>
        </p>
      </section>

      {/* INDICATEURS GÉNÉRAUX */}

      {chargement && (
        <p role="status">
          Chargement des données pour {nomTerritoire}
          {' — '}{periodeAnalysee}...
        </p>
      )}

      {erreur && (
        <p role="alert" style={{ color: '#b00020' }}>
          {erreur}
        </p>
      )}

      {!chargement && statistiques && (
        <section className="statistiques">
          <div className="carte">
            <h3>Offres d'emploi</h3>
            <p>{afficherNombre(statistiques.nombre_offres)}</p>
          </div>

          <div className="carte">
            <h3>Postes vacants</h3>
            <p>{afficherNombre(statistiques.postes_vacants)}</p>
          </div>

          <div className="carte">
            <h3>Professions TI</h3>
            <p>{afficherNombre(statistiques.nombre_professions)}</p>
          </div>
        </section>
      )}

      {/* GRAPHIQUE 1 : ÉVOLUTION MENSUELLE */}

      <section className="graphique">
        <h2>Évolution mensuelle des offres d'emploi TI</h2>

        <p>
          {moisSelectionne
            ? `Nombre d'offres publiées en ${nomMois.toLowerCase()} dans la zone sélectionnée : ${nomTerritoire}.`
            : `Évolution des offres publiées dans la zone sélectionnée (${nomTerritoire}), de janvier à septembre 2026.`}
          {' '}Une offre peut annoncer plusieurs postes : c'est
          pourquoi le nombre de postes vacants est plus élevé.
        </p>

        {!chargement && donneesMensuelles.length > 0 ? (
          <div style={{ width: '100%', height: 350 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={donneesMensuelles}
                margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
              >
                <CartesianGrid stroke={COULEURS.grille} />

                <XAxis
                  dataKey="mois"
                  tickFormatter={afficherMois}
                />

                <YAxis domain={[0, 'auto']} />

                <Tooltip
                  labelFormatter={afficherMois}
                  formatter={(valeur, nom) => [
                    afficherNombre(valeur),
                    nom
                  ]}
                />

                <Legend />

                <Line
                  type="linear"
                  dataKey="nombre_offres"
                  name="Offres d'emploi"
                  stroke={COULEURS.donnees}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />

                <Line
                  type="linear"
                  dataKey="postes_vacants"
                  name="Postes vacants"
                  stroke={COULEURS.donneesSecondaires}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          !erreur && (
            <p>
              {chargement
                ? 'Chargement du graphique...'
                : 'Aucune donnée mensuelle disponible.'}
            </p>
          )
        )}
      </section>

      {/* GRAPHIQUE 2 : PROFESSIONS TI */}

      <section className="graphique">
        <h2>
          Répartition des offres d'emploi par profession TI
        </h2>

        <p>
          Comparaison des professions selon le nombre
          d'offres publiées.
          {' '}Zone analysée : {nomTerritoire}.
          {' '}Période : {periodeAnalysee}.
        </p>

        {!chargement && donneesProfessions.length > 0 ? (
          <>
            <div
              style={{
                width: '100%',
                height: afficherToutes ? 700 : 500
              }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={professionsAffichees}
                  layout="vertical"
                  margin={{
                    top: 10,
                    right: 65,
                    left: 5,
                    bottom: 10
                  }}
                >
                  <CartesianGrid stroke={COULEURS.grille} />

                  <XAxis type="number" />

                  <YAxis
                    type="category"
                    dataKey="nom_court"
                    width={largeurEtiquettes}
                    tick={{ fontSize: tailleEtiquettes }}
                    interval={0}
                  />

                  <Tooltip
                    cursor={{ fill: COULEURS.survol }}
                    formatter={(valeur) => [
                      afficherNombre(valeur),
                      "Nombre d'offres"
                    ]}
                    labelFormatter={(_, elements) =>
                      elements?.[0]?.payload?.nom_profession || ''
                    }
                  />

                  <Bar
                    dataKey="nombre_offres"
                    name="Nombre d'offres"
                    fill={COULEURS.donnees}
                  >
                    <LabelList
                      dataKey="nombre_offres"
                      position="right"
                      formatter={afficherNombre}
                      style={{
                        fontSize: 11,
                        fill: COULEURS.texte
                      }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div
              style={{
                textAlign: 'center',
                marginTop: 20
              }}
            >
              <button
                type="button"
                onClick={() =>
                  setAfficherToutes(!afficherToutes)
                }
                style={styleBouton}
              >
                {afficherToutes
                  ? 'Afficher le Top 10'
                  : 'Voir toutes les professions'}
              </button>
            </div>
          </>
        ) : (
          !erreur && (
            <p>
              {chargement
                ? 'Chargement des professions...'
                : 'Aucune offre disponible pour cette sélection.'}
            </p>
          )
        )}
      </section>

      {/* GRAPHIQUE 3 : PROVINCES */}

      <section className="graphique">
        <h2>
          Répartition des offres d'emploi TI par province
        </h2>

        <p>
          {provinceSelectionnee
            ? `Offres d'emploi TI dans la zone sélectionnée : ${provinceSelectionnee}.`
            : "Comparaison géographique des offres d'emploi TI au Canada."}
          {' '}Période : {periodeAnalysee}.
        </p>

        {erreurProvinces && (
          <p style={{ color: '#b00020' }}>{erreurProvinces}</p>
        )}

        {!chargement && donneesProvinces.length > 0 ? (
          <div
            style={{
              width: '100%',
              height: Math.max(
                160,
                donneesProvinces.length * 48
              )
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={donneesProvinces}
                layout="vertical"
                margin={{
                  top: 10,
                  right: 75,
                  left: 10,
                  bottom: 10
                }}
              >
                <CartesianGrid stroke={COULEURS.grille} />

                <XAxis type="number" />

                <YAxis
                  type="category"
                  dataKey="province"
                  width={largeurEtiquettes}
                  tick={{ fontSize: tailleEtiquettes }}
                  interval={0}
                />

                <Tooltip
                  cursor={{ fill: COULEURS.survol }}
                  formatter={(valeur) => [
                    afficherNombre(valeur),
                    "Nombre d'offres"
                  ]}
                />

                <Bar
                  dataKey="nombre_offres"
                  name="Nombre d'offres"
                  fill={COULEURS.donnees}
                >
                  <LabelList
                    dataKey="nombre_offres"
                    position="right"
                    formatter={afficherNombre}
                    style={{
                      fontSize: 11,
                      fill: COULEURS.texte
                    }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          !erreur && !erreurProvinces && (
            <p>
              {chargement
                ? 'Chargement des provinces...'
                : 'Aucune donnée géographique disponible.'}
            </p>
          )
        )}
      </section>

      {/* GRAPHIQUE 4 : SALAIRES PAR PROFESSION */}

      <section className="graphique">
        <h2>
          Salaires horaires moyens estimés par profession TI
        </h2>

        <p>
          Moyenne des milieux de fourchettes salariales horaires
          annoncées dans les offres exploitables.
          Les montants sont exprimés en dollars canadiens par heure.
          {' '}Zone analysée : {nomTerritoire}.
          {' '}Période : {periodeAnalysee}.
        </p>

        {!chargement && tauxSalairesExploitables !== null && (
          <p
            style={{
              fontSize: 14,
              color: COULEURS.texteSecondaire
            }}
          >
            Salaire horaire exploitable pour{' '}
            <strong>
              {afficherNombre(offresSalaireExploitable)} offres
              sur {afficherNombre(totalOffresSalaires)}
            </strong>
            {' '}({tauxSalairesExploitables} %). Les autres offres
            annoncent un salaire annuel, hebdomadaire ou aucun
            montant comparable.
          </p>
        )}

        {!chargement && donneesSalaires.length > 0 ? (
          <>
            <div
              style={{
                width: '100%',
                height: afficherTousSalaires ? 700 : 500
              }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={salairesAffiches}
                  layout="vertical"
                  margin={{
                    top: 10,
                    right: 90,
                    left: 5,
                    bottom: 10
                  }}
                >
                  <CartesianGrid stroke={COULEURS.grille} />

                  <XAxis
                    type="number"
                    domain={[0, 'auto']}
                    tickFormatter={(valeur) => `${valeur} $`}
                  />

                  <YAxis
                    type="category"
                    dataKey="nom_court"
                    width={largeurEtiquettes}
                    tick={{ fontSize: tailleEtiquettes }}
                    interval={0}
                  />

                  <Tooltip
                    cursor={{ fill: COULEURS.survol }}
                    formatter={(valeur) => [
                      afficherSalaire(valeur),
                      'Salaire horaire moyen estimé'
                    ]}
                    labelFormatter={(_, elements) =>
                      elements?.[0]?.payload?.nom_profession || ''
                    }
                  />

                  <Bar
                    dataKey="salaire_horaire_moyen"
                    name="Salaire horaire moyen estimé"
                    fill={COULEURS.donnees}
                  >
                    <LabelList
                      dataKey="salaire_horaire_moyen"
                      position="right"
                      formatter={afficherSalaire}
                      style={{
                        fontSize: 11,
                        fill: COULEURS.texte
                      }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div
              style={{
                textAlign: 'center',
                marginTop: 20
              }}
            >
              <button
                type="button"
                onClick={() =>
                  setAfficherTousSalaires(!afficherTousSalaires)
                }
                style={styleBouton}
              >
                {afficherTousSalaires
                  ? 'Afficher le Top 10'
                  : 'Voir toutes les professions'}
              </button>
            </div>

            <p
              style={{
                fontSize: 13,
                color: COULEURS.texteSecondaire,
                marginTop: 20
              }}
            >
              Note : ces valeurs sont calculées uniquement
              à partir des offres disposant de données
              salariales horaires exploitables. Elles ne
              représentent pas les salaires réellement
              versés aux travailleurs.
            </p>
          </>
        ) : (
          !erreur && (
            <p>
              {chargement
                ? 'Chargement des données salariales...'
                : 'Aucune donnée salariale exploitable pour cette sélection.'}
            </p>
          )
        )}
      </section>

      {/* À PROPOS DU PROJET */}

      <section className="graphique a-propos">
        <h2>À propos du projet</h2>

        <h3>Pourquoi ce tableau de bord ?</h3>

        <p>
          Je suis finissante en informatique et je m'intéresse
          surtout aux données. Comme beaucoup d'étudiants en fin
          de parcours, je sais que le marché du travail peut
          sembler hostile et que l'idée de chercher un emploi
          est stressante. Ce site permet aux finissants qui
          n'ont pas encore eu de stage ou d'emploi de voir plus
          clairement les tendances et les offres en TI au Canada :
          quelles professions recrutent, dans quelles provinces
          et à quels salaires s'attendre.
        </p>

        <h3>D'où viennent les données ?</h3>

        <p>
          Les données proviennent des fichiers ouverts d'offres
          d'emploi de Guichet-Emplois, publiés sur le Portail du
          gouvernement ouvert du Canada. Neuf fichiers mensuels,
          de janvier à septembre 2026, ont été regroupés et
          nettoyés. Seules les offres associées à 15 codes de la
          Classification nationale des professions (CNP 2021)
          liés aux technologies de l'information ont été
          conservées.
        </p>

        <h3>Limites à garder en tête</h3>

        <ul>
          <li>
            Les données couvrent uniquement les offres publiées
            sur Guichet-Emplois, et non l'ensemble du marché
            canadien.
          </li>
          <li>
            Une offre peut annoncer plusieurs postes vacants :
            le nombre d'offres et le nombre de postes sont donc
            présentés séparément.
          </li>
          <li>
            Les salaires sont calculés seulement à partir des
            offres qui annoncent un salaire horaire exploitable.
            Il s'agit de salaires proposés, et non de salaires
            réellement versés.
          </li>
          <li>
            La sélection de 15 professions correspond au
            périmètre choisi pour ce projet et ne couvre pas
            toutes les professions liées aux TI.
          </li>
        </ul>
      </section>

      <footer className="pied-de-page">
        <p>
          Anta Mbaye SENE — Projet de synthèse, Université du
          Québec en Outaouais, automne 2026.
        </p>
        <p>
          Source des données :{' '}
          <a
            href="https://www.guichetemplois.gc.ca"
            target="_blank"
            rel="noreferrer"
          >
            Guichet-Emplois
          </a>
          {' '}(données ouvertes, janvier à septembre 2026).
        </p>
      </footer>
    </main>
  )
}

export default App