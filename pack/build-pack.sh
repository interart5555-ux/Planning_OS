#!/usr/bin/env bash
# Monta o pack de instalação em ZIP a partir dos dois repositórios.
#
#   pack/build-pack.sh [caminho-do-dump-de-dados.sql]
#
# Corre no repositório Planning_OS. Precisa de ../alclean/app (repositório da
# app) ao lado. O ZIP fica em ../alclean-pack-<data>.zip. Nunca inclui .env,
# node_modules, .git, ficheiros gerados nem registos de execução.
set -euo pipefail
RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
APP="$RAIZ/../alclean/app"
DATA="$(date +%Y-%m-%d)"
NOME="alclean-pack-$DATA"
OUT="$RAIZ/../$NOME"
DUMP="${1:-}"

[ -d "$APP/.git" ] || { echo "Não encontro o repositório da app em $APP"; exit 1; }
rm -rf "$OUT" && mkdir -p "$OUT"

# Documentos de topo
cp "$RAIZ/pack/LEIA-ME.md" "$RAIZ/pack/CLAUDE.md" "$RAIZ/pack/GUIA_INSTALACAO.md" "$OUT/"
cp "$RAIZ/REPLICATION_GUIDE.md" "$OUT/"

# Código da app: o que está no git do ramo main (sem .env, sem gerados)
mkdir -p "$OUT/app"
git -C "$APP" archive main | tar -x -C "$OUT/app"

# Base de dados
mkdir -p "$OUT/db"
cp "$RAIZ/rebuild/db/"*.sql "$RAIZ/rebuild/README.md" "$OUT/db/"

# Instalador
mkdir -p "$OUT/instalador"
cp "$RAIZ/pack/instalador/"*.sh "$OUT/instalador/"
chmod +x "$OUT/instalador/"*.sh

# Dados (opcional)
mkdir -p "$OUT/dados"
cp "$RAIZ/pack/dados/README.md" "$OUT/dados/"
if [ -n "$DUMP" ]; then cp "$DUMP" "$OUT/dados/"; fi

# Memória do projeto
mkdir -p "$OUT/docs"
cp "$RAIZ/docs/brief-reconstrucao-appos-alclean.md" "$RAIZ/docs/auditoria-2026-09-19.md" \
   "$RAIZ/docs/auditoria-consolidacao-2026-09-22.md" "$RAIZ/docs/estado-projeto.md" \
   "$RAIZ/docs/superpowers/melhoria-continua.md" "$OUT/docs/"

# Skills do template (para empresas futuras)
mkdir -p "$OUT/template"
cp -R "$RAIZ/.claude/skills" "$OUT/template/skills"

# Nada de segredos: verificação antes de fechar
if grep -rEl "sb_secret_[A-Za-z0-9_-]{15}|SUPABASE_SERVICE_ROLE_KEY=[A-Za-z0-9_-]{20,}|eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI" "$OUT" >/dev/null; then
  echo "ATENÇÃO: encontrei o que parece ser uma chave no pack. Abortado."; exit 1
fi
find "$OUT" -name ".DS_Store" -delete

cd "$RAIZ/.." && rm -f "$NOME.zip" && zip -qr "$NOME.zip" "$NOME" -x "*/.DS_Store"
rm -rf "$OUT"
echo "Pack criado: $RAIZ/../$NOME.zip ($(du -h "$NOME.zip" | cut -f1))"
