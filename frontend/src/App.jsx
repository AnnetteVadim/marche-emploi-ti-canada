 
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
  ResponsiveContainer,
  LabelList
} from 'recharts'

import './App.css'

const API_URL = 'http://127.0.0.1:8000'

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
  borderRadius: 8,
  border: '1px solid #cbd5e1',
  backgroundColor: 'white',
  color: '#17365d',
  fontSize: 15,
  minWidth: 250,
  maxWidth: '100%'
}

const styleBouton = (couleur) => ({
  backgroundColor: couleur,
  color: 'white',
  border: 'none',
  padding: '12px 22px',
  borderRadius: 8,
  fontSize: 14,
  cursor: 'pointer',
  fontWeight: 600
})

function App() {
  // ==========================================================
  // 1. ÉTATS DE L'APPLICATION
  // ==========================================================

  const [statistiques, setStatistiques] = useState(null)
  const [donneesMensuelles, setDonneesMensuelles] = useState([])
  const [donneesProfessions, setDonneesProfessions] = useState([])
  const [donneesProvinces, setDonneesProvinces] = useState([])
  const [donneesSalaires, setDonneesSalaires] = useState([])

  const [listeProvinces, setListeProvinces] = useState([])

  // Chaîne vide = aucun filtre sur cette dimension.
  const [provinceSelectionnee, setProvinceSelectionnee] = useState('')
  const [moisSelectionne, setMoisSelectionne] = useState('')

  const [afficherToutes, setAfficherToutes] = useState(false)
  const [afficherTousSalaires, setAfficherTousSalaires] = useState(false)

  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState('')
  const [erreurProvinces, setErreurProvinces] = useState('')

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

      try {
        const [
          generales,
          mensuelles,
          professions,
          provinces,
          salaires
        ] = await Promise.all([
          recupererDonnees('generales'),
          recupererDonnees('mensuelles'),
          recupererDonnees('professions'),
          recupererDonnees('provinces'),
          recupererDonnees('salaires-professions')
        ])

        if (controleur.signal.aborted) return

        setStatistiques(generales)
        setDonneesMensuelles(mensuelles)

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
        de janvier à septembre 2026.
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
              style={styleBouton('#475569')}
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>

        <p
          style={{
            marginTop: 16,
            fontSize: 14,
            color: '#64748b'
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
        <p role="alert" style={{ color: 'red' }}>
          {erreur}
        </p>
      )}

      {!chargement && statistiques && (
        <section className="statistiques">
          <div className="carte">
            <h2>Offres d'emploi</h2>
            <p>{afficherNombre(statistiques.nombre_offres)}</p>
          </div>

          <div className="carte">
            <h2>Postes vacants</h2>
            <p>{afficherNombre(statistiques.postes_vacants)}</p>
          </div>

          <div className="carte">
            <h2>Professions TI</h2>
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
        </p>

        {!chargement && donneesMensuelles.length > 0 ? (
          <div style={{ width: '100%', height: 350 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={donneesMensuelles}>
                <CartesianGrid strokeDasharray="3 3" />

                <XAxis
                  dataKey="mois"
                  tickFormatter={afficherMois}
                />

                <YAxis domain={[0, 'auto']} />

                <Tooltip
                  labelFormatter={afficherMois}
                  formatter={(valeur) => [
                    afficherNombre(valeur),
                    "Nombre d'offres"
                  ]}
                />

                <Line
                  type="monotone"
                  dataKey="nombre_offres"
                  name="Offres d'emploi"
                  stroke="#2563eb"
                  strokeWidth={3}
                  dot={{ r: 5 }}
                  activeDot={{ r: 7 }}
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
                  <CartesianGrid strokeDasharray="3 3" />

                  <XAxis type="number" />

                  <YAxis
                    type="category"
                    dataKey="nom_court"
                    width={185}
                    tick={{ fontSize: 12 }}
                    interval={0}
                  />

                  <Tooltip
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
                    fill="#2563eb"
                    radius={[0, 5, 5, 0]}
                  >
                    <LabelList
                      dataKey="nombre_offres"
                      position="right"
                      formatter={afficherNombre}
                      style={{
                        fontSize: 11,
                        fill: '#17365d'
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
                style={styleBouton('#2563eb')}
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
          <p style={{ color: 'red' }}>{erreurProvinces}</p>
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
                <CartesianGrid strokeDasharray="3 3" />

                <XAxis type="number" />

                <YAxis
                  type="category"
                  dataKey="province"
                  width={175}
                  tick={{ fontSize: 12 }}
                  interval={0}
                />

                <Tooltip
                  formatter={(valeur) => [
                    afficherNombre(valeur),
                    "Nombre d'offres"
                  ]}
                />

                <Bar
                  dataKey="nombre_offres"
                  name="Nombre d'offres"
                  fill="#0d9488"
                  radius={[0, 5, 5, 0]}
                >
                  <LabelList
                    dataKey="nombre_offres"
                    position="right"
                    formatter={afficherNombre}
                    style={{
                      fontSize: 11,
                      fill: '#17365d'
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
                  <CartesianGrid strokeDasharray="3 3" />

                  <XAxis
                    type="number"
                    domain={[0, 'auto']}
                    tickFormatter={(valeur) => `${valeur} $`}
                  />

                  <YAxis
                    type="category"
                    dataKey="nom_court"
                    width={185}
                    tick={{ fontSize: 12 }}
                    interval={0}
                  />

                  <Tooltip
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
                    fill="#7c3aed"
                    radius={[0, 5, 5, 0]}
                  >
                    <LabelList
                      dataKey="salaire_horaire_moyen"
                      position="right"
                      formatter={afficherSalaire}
                      style={{
                        fontSize: 11,
                        fill: '#17365d'
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
                style={styleBouton('#7c3aed')}
              >
                {afficherTousSalaires
                  ? 'Afficher le Top 10'
                  : 'Voir toutes les professions'}
              </button>
            </div>

            <p
              style={{
                fontSize: 13,
                color: '#64748b',
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
    </main>
  )
}

export default App
