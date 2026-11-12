
import psycopg

try:
    with psycopg.connect(
        host="localhost",
        port=5433,
        dbname="emploi_ti",
        user="emploi_user",
        password="emploi_dev_local"
    ) as connexion:

        with connexion.cursor() as curseur:
            curseur.execute(
                "SELECT current_database(), current_user;"
            )

            resultat = curseur.fetchone()

            print("Connexion PostgreSQL réussie !")
            print("Base de données :", resultat[0])
            print("Utilisateur :", resultat[1])

except psycopg.Error as erreur:
    print("Erreur de connexion PostgreSQL :", erreur)
