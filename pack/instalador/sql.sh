#!/usr/bin/env bash
# Corre uma instrução SQL avulsa na base de dados do projeto (mesma ligação que aplicar-sql.sh).
#   instalador/sql.sh "select count(*) from pg_tables where schemaname='public';"
set -euo pipefail
AQUI="$(cd "$(dirname "$0")/.." && pwd)"
SQL="${1:?Uso: sql.sh \"<instrução>\"}"
DB_URL="$(grep -E '^SUPABASE_DB_URL=' "$AQUI/app/.env" | head -1 | cut -d= -f2- | tr -d '"'"'" )"
[ -n "$DB_URL" ] || { echo "Falta SUPABASE_DB_URL em app/.env."; exit 1; }
if command -v psql >/dev/null 2>&1; then
  psql "$DB_URL" -v ON_ERROR_STOP=1 -At -c "$SQL"
else
  docker run --rm -i postgres:17 psql "$DB_URL" -v ON_ERROR_STOP=1 -At -c "$SQL"
fi
