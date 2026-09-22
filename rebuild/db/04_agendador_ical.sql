-- O agendador: de hora a hora, `pg_cron` chama a Edge Function por `pg_net`.
--
-- As plataformas atualizam os seus calendários com atraso próprio, de minutos
-- a horas; de hora a hora é tão rápido quanto faz sentido. O minuto 7 e não o
-- 0: à hora certa toda a gente do planeta corre as suas tarefas ao mesmo tempo,
-- e o Airbnb responde pior.
--
-- Nem o endereço do projeto, nem o segredo do agendador, nem a chave da API
-- estão escritos neste ficheiro. Vêm do Vault do Supabase, onde o utilizador os
-- põe à mão antes de aplicar esta migração — um ficheiro de migração vive no
-- Git, e um segredo no Git é um segredo publicado.
--
-- ---------------------------------------------------------------------------
-- PORQUÊ UM CABEÇALHO `Authorization` ALÉM DO `x-alclean-cron`
-- ---------------------------------------------------------------------------
-- A proteção de JWT da plataforma está LIGADA na função `sync-calendars`.
-- Medido a 2026-09-22 contra a função publicada:
--   * sem credencial nenhuma  → 401, a plataforma recusa à porta e o nosso
--     código nem chega a correr;
--   * com a chave publicável e `x-alclean-cron` certo → passa.
-- Sem `Authorization`, este agendador levava 401 de hora a hora, em silêncio,
-- e nunca sincronizava nada. O `x-alclean-cron` sozinho não chega: é a nossa
-- porta, não a da plataforma.
--
-- A chave que vai no `Authorization` é a PUBLICÁVEL, não a `service_role`:
--   * ela só tem de abrir a porta da plataforma. Quem chama é identificado
--     depois, pelo `x-alclean-cron`, e `index.ts` decide por esse segredo antes
--     de olhar para a sessão — a chave do `Authorization` nunca dá acesso a
--     dado nenhum neste caminho;
--   * a escrita em `jobs` é feita pela própria função, com a `service_role` que
--     já tem nos seus próprios segredos. Não precisa da nossa;
--   * a chave publicável já viaja dentro do bundle do browser: uma cópia dela
--     no Vault não acrescenta exposição nenhuma. Uma cópia da `service_role` no
--     Vault seria uma segunda casa para a credencial mais poderosa do projeto,
--     ao alcance de qualquer `select` de quem chegue à base de dados.
-- É também o que a própria Supabase recomenda em "Scheduling Edge Functions".
--
-- ---------------------------------------------------------------------------
-- PRÉ-REQUISITOS, feitos à mão pelo utilizador ANTES de aplicar isto:
--   1. Database → Extensions → ligar `pg_cron` e `pg_net`.
--   2. Três segredos no Vault: `alclean_functions_url`,
--      `alclean_cron_segredo` e `alclean_chave_publicavel`.
-- Se faltar algum, esta migração pára com uma mensagem que diz qual.

do $$
declare
  v_url text;
  v_segredo text;
  v_chave text;
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    raise exception 'A extensão pg_cron não está ligada. Painel do Supabase → Database → Extensions → pg_cron.';
  end if;
  if not exists (select 1 from pg_extension where extname = 'pg_net') then
    raise exception 'A extensão pg_net não está ligada. Painel do Supabase → Database → Extensions → pg_net.';
  end if;

  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'alclean_functions_url';
  if v_url is null then
    raise exception 'Falta o segredo alclean_functions_url no Vault (ex.: https://<projeto>.supabase.co/functions/v1/sync-calendars).';
  end if;
  -- O engano fácil é guardar aqui só o endereço do projeto. O agendador ficava
  -- a bater na página inicial da API e ninguém reparava.
  if position('/functions/v1/sync-calendars' in v_url) = 0 then
    raise exception 'O segredo alclean_functions_url tem de ser o endereço COMPLETO da função e acabar em /functions/v1/sync-calendars.';
  end if;

  select decrypted_secret into v_segredo from vault.decrypted_secrets where name = 'alclean_cron_segredo';
  if v_segredo is null then
    raise exception 'Falta o segredo alclean_cron_segredo no Vault (o mesmo valor que ALCLEAN_CRON_SEGREDO na Edge Function).';
  end if;

  select decrypted_secret into v_chave from vault.decrypted_secrets where name = 'alclean_chave_publicavel';
  if v_chave is null then
    raise exception 'Falta o segredo alclean_chave_publicavel no Vault (Project Settings → API Keys → a chave publicável, sb_publishable_...).';
  end if;
  -- Guarda contra a troca perigosa: aqui não entra a chave secreta. Se alguém
  -- colar a `service_role` por engano, é melhor esta migração recusar do que
  -- ficar com ela guardada na base de dados para sempre.
  if v_chave like 'sb_secret_%' then
    raise exception 'O segredo alclean_chave_publicavel tem a chave SECRETA (sb_secret_...). O agendador só precisa da publicável (sb_publishable_...). Substitui-o no Vault.';
  end if;
end $$;

-- Seguro para reexecução: tirar a tarefa antes de a voltar a pôr evita duas
-- tarefas iguais a correr ao mesmo tempo se esta migração for aplicada duas
-- vezes.
select cron.unschedule('alclean-sincronizar-calendarios')
where exists (select 1 from cron.job where jobname = 'alclean-sincronizar-calendarios');

-- O corpo da tarefa lê o Vault a cada execução, e não uma só vez aqui: assim,
-- trocar o segredo ou a chave é mudar o Vault, sem voltar a aplicar migração
-- nenhuma.
--
-- Vão três cabeçalhos: `Authorization` para a plataforma deixar entrar,
-- `apikey` porque é o par que a Supabase espera ver (e que `index.ts` já
-- autoriza no CORS), e `x-alclean-cron` para a função saber que é o agendador
-- e não uma gestora.
select cron.schedule(
  'alclean-sincronizar-calendarios',
  '7 * * * *',
  $cron$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'alclean_functions_url'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'alclean_chave_publicavel'),
      'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'alclean_chave_publicavel'),
      'x-alclean-cron', (select decrypted_secret from vault.decrypted_secrets where name = 'alclean_cron_segredo')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
  $cron$
);
