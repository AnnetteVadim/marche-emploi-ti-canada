import psycopg

from backend.database import get_connection

# Lancement, à partir de la racine du projet :
#     python -m backend.test_connexion

try:
    with get_connection() as connexion:

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