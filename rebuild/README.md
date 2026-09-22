# Kit de reconstrução da base de dados — ALClean

*Gerado a 22 de setembro de 2026 a partir do projeto Supabase `jhwcpaxdlcefglkcmfrg`
(`alclean`, eu-west-1, Postgres 17). Ver `../REPLICATION_GUIDE.md` para o processo completo.*

## Ficheiros

| Ficheiro | O que é | Aplicar a |
|---|---|---|
| `db/01_esquema_publico.sql` | O esquema `public` completo e **já podado**: 33 tabelas, 20 enums, 51 funções, 19 gatilhos, 3 vistas, 72 políticas, índices, comentários e permissões. É um `supabase db dump --schema public` de uma base reconstruída das 35 migrações históricas mais a poda | Projeto **novo**, primeiro |
| `db/02_tempo_real_e_storage.sql` | Publicação `supabase_realtime` (29 tabelas), bucket `job-photos` e as 4 políticas de Storage | Projeto novo, segundo |
| `db/03_sementes_estruturais.sql` | A linha única de `company_settings` e os modelos das listas de execução (11 + 5 linhas) | Projeto novo, terceiro |
| `db/04_agendador_ical.sql` | Tarefa `pg_cron` de hora a hora que chama a Edge Function `sync-calendars`. Cópia fiel da migração `0034` | Projeto novo, **depois** dos pré-requisitos manuais (extensões + Vault) |
| `db/poda-projeto-atual.sql` | As correções que o `01` já traz, para aplicar ao projeto **existente** sem o reconstruir | Projeto atual |

## Como foi verificado

1. As 35 migrações de `alclean/app/supabase/migrations/` foram aplicadas por ordem a uma instância
   local (`supabase start`). **Por ordem numérica falham** em `0035` (`SQLSTATE 42723`: `0033` foi
   escrita depois de `0035` e cria a mesma função). Com `0033` aplicada em último lugar (renomeada
   `0036`) e `0034` de fora, as 34 aplicam-se limpas.
2. O esquema resultante foi comparado com um `dump` do projeto vivo: **os mesmos objetos, os mesmos
   corpos** (as únicas diferenças são espaços e comentários nas funções de `0031`–`0033`, que foram
   aplicadas ao vivo sem os comentários).
3. A poda e os ficheiros `02`/`03` foram aplicados à instância local. Verificado: 33 tabelas, 29
   publicadas, 1 bucket, 4 políticas de Storage, 0 funções sem `pg_temp`, `job_month_stats` com
   `security_invoker`, `billable_units` ausente.
4. `01_esquema_publico.sql` é o `dump` dessa instância.
5. `npm run rls-check` correu contra a instância local reconstruída — resultado registado em
   `docs/auditoria-consolidacao-2026-09-22.md`, secção 2.

## Regras para manter este kit vivo

- Cada alteração futura ao esquema é uma migração nova em `alclean/app/supabase/migrations/`
  (nunca editar `01`). De tempos a tempos, regenerar `01` com o mesmo procedimento acima.
- `03` tem de continuar igual a `src/modules/execucao/config.ts` (o servidor materializa as listas
  de cada limpeza a partir destas linhas).
- Nenhum segredo entra aqui. O `04` lê o Vault em tempo de execução, de propósito.
