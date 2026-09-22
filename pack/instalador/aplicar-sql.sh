#!/usr/bin/env bash
# Aplica um ficheiro SQL à base de dados do projeto Supabase, numa só transação.
#
#   instalador/aplicar-sql.sh db/01_esquema_publico.sql
#
# Lê SUPABASE_DB_URL do ficheiro app/.env (a "Session pooler" connection string,
# com a password da base de dados). Usa o psql do computador se existir; senão,
# o psql da imagem Docker postgres:17. Nunca imprime a ligação.
set -euo pipefail
AQUI="$(cd "$(dirname "$0")/.." && pwd)"
FICHEIRO="${1:?Uso: aplicar-sql.sh <ficheiro.sql>}"
[ -f "$FICHEIRO" ] || { echo "Não encontro $FICHEIRO"; exit 1; }
ENV="$AQUI/app/.env"
[ -f "$ENV" ] || { echo "Falta $ENV (copia app/.env.example para app/.env e preenche)."; exit 1; }
DB_URL="$(grep -E '^SUPABASE_DB_URL=' "$ENV" | head -1 | cut -d= -f2- | tr -d '"'"'" )"
[ -n "$DB_URL" ] || { echo "Falta SUPABASE_DB_URL em app/.env."; exit 1; }

if command -v psql >/dev/null 2>&1; then
  psql "$DB_URL" --single-transaction -v ON_ERROR_STOP=1 -q -f "$FICHEIRO"
elif command -v docker >/dev/null 2>&1; then
  docker run --rm -i -e PGPASSWORD_UNUSED=1 postgres:17 psql "$DB_URL" --single-transaction -v ON_ERROR_STOP=1 -q < "$FICHEIRO"
else
  echo "Preciso de psql (brew install libpq && brew link --force libpq) ou do Docker."; exit 1
fi
echo "Aplicado: $FICHEIRO"
