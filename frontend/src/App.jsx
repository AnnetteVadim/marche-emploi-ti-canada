
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

// Afficher les mois en français
const afficherMois = (valeur) => {
  const mois = [
    'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
    'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'
  ]

  const numero = Number(String(valeur).slice(-2))
  return mois[numero - 1] || valeur
}

// Noms courts des professions
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

// Formater les nombres
const afficherNombre = (valeur) =>
  Number(valeur).toLocaleString('fr-CA')

// Formater les salaires
const afficherSalaire = (valeur) =>
  `${Number(valeur).toLocaleString('fr-CA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })} $/h`

function App() {
  const [statistiques, setStatistiques] = useState(null)
  const [donneesMensuelles, setDonneesMensuelles] = useState([])
  const [donneesProfessions, setDonneesProfessions] = useState([])
  const [donneesProvinces, setDonneesProvinces] = useState([])
  const [donneesSalaires, setDonneesSalaires] = useState([])

  const [afficherToutes, setAfficherToutes] = useState(false)
  const [afficherTousSalaires, setAfficherTousSalaires] = useState(false)

  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState('')
  const [erreurProfessions, setErreurProfessions] = useState('')
  const [erreurProvinces, setErreurProvinces] = useState('')
  const [erreurSalaires, setErreurSalaires] = useState('')

  // 1. Statistiques générales
  useEffect(() => {
    async function chargerStatistiques() {
      try {
        const reponse = await fetch(
          `${API_URL}/statistiques/generales`
        )

        if (!reponse.ok) {
          throw new Error('Erreur de chargement des statistiques')
        }

        const donnees = await reponse.json()
        setStatistiques(donnees)
      } catch (error) {
        setErreur(error.message)
      } finally {
        setChargement(false)
      }
    }

    chargerStatistiques()
  }, [])

  // 2. Évolution mensuelle
  useEffect(() => {
    async function chargerDonneesMensuelles() {
      try {
        const reponse = await fetch(
          `${API_URL}/statistiques/mensuelles`
        )

        if (!reponse.ok) {
          throw new Error('Erreur de chargement des données mensuelles')
        }

        const donnees = await reponse.json()
        setDonneesMensuelles(donnees)
      } catch (error) {
        console.error(error)
      }
    }

    chargerDonneesMensuelles()
  }, [])

  // 3. Professions TI
  useEffect(() => {
    async function chargerProfessions() {
      try {
        const reponse = await fetch(
          `${API_URL}/statistiques/professions`
        )

        if (!reponse.ok) {
          throw new Error('Erreur de chargement des professions')
        }

        const donnees = await reponse.json()

        setDonneesProfessions(
          donnees.map((profession) => ({
            ...profession,
            nom_court:
              nomsCourts[String(profession.code_cnp)] ||
              profession.nom_profession
          }))
        )
      } catch (error) {
        setErreurProfessions(error.message)
      }
    }

    chargerProfessions()
  }, [])

  // 4. Répartition par province
  useEffect(() => {
    async function chargerProvinces() {
      try {
        const reponse = await fetch(
          `${API_URL}/statistiques/provinces`
        )

        if (!reponse.ok) {
          throw new Error('Erreur de chargement des provinces')
        }

        const donnees = await reponse.json()

        setDonneesProvinces(
          [...donnees].sort(
            (a, b) => b.nombre_offres - a.nombre_offres
          )
        )
      } catch (error) {
        setErreurProvinces(error.message)
      }
    }

    chargerProvinces()
  }, [])

  // 5. Salaires horaires estimés par profession
  useEffect(() => {
    async function chargerSalaires() {
      try {
        const reponse = await fetch(
          `${API_URL}/statistiques/salaires-professions`
        )

        if (!reponse.ok) {
          throw new Error('Erreur de chargement des salaires')
        }

        const donnees = await reponse.json()

        const salaires = donnees
          .map((profession) => ({
            ...profession,
            nom_court:
              nomsCourts[String(profession.code_cnp)] ||
              profession.nom_profession
          }))
          .sort(
            (a, b) =>
              b.salaire_horaire_moyen - a.salaire_horaire_moyen
          )

        setDonneesSalaires(salaires)
      } catch (error) {
        setErreurSalaires(error.message)
      }
    }

    chargerSalaires()
  }, [])

  // Top 10 ou toutes les professions
  const professionsTriees = [...donneesProfessions].sort(
    (a, b) => b.nombre_offres - a.nombre_offres
  )

  const professionsAffichees = afficherToutes
    ? professionsTriees
    : professionsTriees.slice(0, 10)

  // Top 10 ou toutes les professions pour les salaires
  const salairesAffiches = afficherTousSalaires
    ? donneesSalaires
    : donneesSalaires.slice(0, 10)

  return (
    <main>
      <h1>Marché de l'emploi TI au Canada</h1>

      <p>
        Tableau de bord d'analyse des offres d'emploi
        de janvier à septembre 2026.
      </p>

      {/* INDICATEURS GÉNÉRAUX */}

      {chargement && (
        <p>Chargement des statistiques...</p>
      )}

      {erreur && (
        <p style={{ color: 'red' }}>{erreur}</p>
      )}

      {statistiques && (
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
            <p>{statistiques.nombre_professions}</p>
          </div>
        </section>
      )}

      {/* GRAPHIQUE 1 : ÉVOLUTION MENSUELLE */}

      <section className="graphique">
        <h2>Évolution mensuelle des offres d'emploi TI</h2>

        {donneesMensuelles.length > 0 ? (
          <div style={{ width: '100%', height: 350 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={donneesMensuelles}>
                <CartesianGrid strokeDasharray="3 3" />

                <XAxis
                  dataKey="mois"
                  tickFormatter={afficherMois}
                />

                <YAxis domain={[0, 'auto']} />

                <Tooltip />

                <Line
                  type="monotone"
                  dataKey="nombre_offres"
                  name="Offres d'emploi"
                  stroke="#2563eb"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p>Chargement du graphique...</p>
        )}
      </section>

      {/* GRAPHIQUE 2 : PROFESSIONS TI */}

      <section className="graphique">
        <h2>Répartition des offres d'emploi par profession TI</h2>

        <p>
          Comparaison des professions selon le nombre
          d'offres publiées entre janvier et septembre 2026.
        </p>

        {erreurProfessions && (
          <p style={{ color: 'red' }}>{erreurProfessions}</p>
        )}

        {donneesProfessions.length > 0 ? (
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

            <div style={{ textAlign: 'center', marginTop: 20 }}>
              <button
                type="button"
                onClick={() => setAfficherToutes(!afficherToutes)}
                style={{
                  backgroundColor: '#2563eb',
                  color: 'white',
                  border: 'none',
                  padding: '12px 22px',
                  borderRadius: 8,
                  fontSize: 14,
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                {afficherToutes
                  ? 'Afficher le Top 10'
                  : 'Voir les 15 professions'}
              </button>
            </div>
          </>
        ) : (
          !erreurProfessions && (
            <p>Chargement des professions...</p>
          )
        )}
      </section>

      {/* GRAPHIQUE 3 : PROVINCES */}

      <section className="graphique">
        <h2>Répartition des offres d'emploi TI par province</h2>

        <p>
          Comparaison géographique des offres d'emploi TI
          publiées entre janvier et septembre 2026.
        </p>

        {erreurProvinces && (
          <p style={{ color: 'red' }}>{erreurProvinces}</p>
        )}

        {donneesProvinces.length > 0 ? (
          <div
            style={{
              width: '100%',
              height: Math.max(420, donneesProvinces.length * 48)
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
          !erreurProvinces && (
            <p>Chargement des provinces...</p>
          )
        )}
      </section>

      {/* GRAPHIQUE 4 : SALAIRES PAR PROFESSION */}

      <section className="graphique">
        <h2>Salaires horaires moyens estimés par profession TI</h2>

        <p>
          Moyenne des milieux de fourchettes salariales horaires
          annoncées dans les offres exploitables.
          Les montants sont exprimés en dollars canadiens par heure.
        </p>

        {erreurSalaires && (
          <p style={{ color: 'red' }}>{erreurSalaires}</p>
        )}

        {donneesSalaires.length > 0 ? (
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

            <div style={{ textAlign: 'center', marginTop: 20 }}>
              <button
                type="button"
                onClick={() =>
                  setAfficherTousSalaires(!afficherTousSalaires)
                }
                style={{
                  backgroundColor: '#7c3aed',
                  color: 'white',
                  border: 'none',
                  padding: '12px 22px',
                  borderRadius: 8,
                  fontSize: 14,
                  cursor: 'pointer',
                  fontWeight: 600
                }}
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
              Note : ces valeurs sont calculées uniquement à partir
              des offres disposant de données salariales horaires
              exploitables. Elles ne représentent pas les salaires
              réellement versés aux travailleurs.
            </p>
          </>
        ) : (
          !erreurSalaires && (
            <p>Chargement des données salariales...</p>
          )
        )}
      </section>
    </main>
  )
}

export default App
