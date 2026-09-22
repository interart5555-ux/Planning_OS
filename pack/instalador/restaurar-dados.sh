#!/usr/bin/env bash
# Restaura os dados exportados do projeto antigo (dados/dados-*.sql) num projeto
# NOVO que já tem o esquema (db/01, 02, 03 aplicados).
#
#   instalador/restaurar-dados.sh dados/dados-2026-09-22.sql
#
# O que faz, numa só transação:
#  1. apaga as sementes estruturais (o ficheiro de dados traz as suas);
#  2. carrega os dados com os gatilhos desligados (o ficheiro já traz
#     `session_replication_role = replica`), senão o servidor voltava a criar
#     as listas de cada limpeza e rebentava em duplicados;
#  3. desliga as pessoas das contas de autenticação do projeto antigo, que não
#     existem no novo: a gestora volta a ligar-se com `npm run gestora:criar`,
#     as colaboradoras recebem acesso de novo no módulo Equipas;
#  4. apaga as referências a fotografias, que não vêm no ficheiro (vivem no
#     Storage do projeto antigo).
set -euo pipefail
AQUI="$(cd "$(dirname "$0")/.." && pwd)"
FICHEIRO="${1:?Uso: restaurar-dados.sh <dados.sql>}"
[ -f "$FICHEIRO" ] || { echo "Não encontro $FICHEIRO"; exit 1; }
DB_URL="$(grep -E '^SUPABASE_DB_URL=' "$AQUI/app/.env" | head -1 | cut -d= -f2- | tr -d '"'"'" )"
[ -n "$DB_URL" ] || { echo "Falta SUPABASE_DB_URL em app/.env."; exit 1; }

ANTES="delete from exec_checklist_template; delete from exec_laundry_template; delete from company_settings;"
DEPOIS="update job_issues set photo_id = null where photo_id is not null;
delete from job_photos;
update people set auth_user_id = null, access = 'none', sent_at = null where role = 'collab';
update people set auth_user_id = null where role = 'manager';"

if command -v psql >/dev/null 2>&1; then
  psql "$DB_URL" --single-transaction -v ON_ERROR_STOP=1 -q -c "$ANTES" -f "$FICHEIRO" -c "$DEPOIS"
else
  { echo "$ANTES"; cat "$FICHEIRO"; echo "$DEPOIS"; } | docker run --rm -i postgres:17 psql "$DB_URL" --single-transaction -v ON_ERROR_STOP=1 -q
fi
echo "Dados restaurados. A seguir: npm run gestora:criar (liga a gestora à conta nova)."
