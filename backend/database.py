
import os

import psycopg


def get_connection():
    """Créer une connexion à la base PostgreSQL."""

    return psycopg.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", "5433")),
        dbname=os.getenv("DB_NAME", "emploi_ti"),
        user=os.getenv("DB_USER", "emploi_user"),
        password=os.environ["DB_PASSWORD"]
    )
