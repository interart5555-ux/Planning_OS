-- Sementes estruturais — as linhas sem as quais a app não funciona.
-- Aplicar depois de 02. Reexecutável (on conflict do nothing).
--
-- NÃO são dados de negócio (pessoas, clientes, limpezas): esses entram pela
-- app ou por scripts/seed.mjs.

-- A linha única das definições da empresa (id boolean com check id = true).
-- Os restantes campos têm defaults; a gestora edita-os no Módulo 1.
insert into company_settings (id) values (true) on conflict (id) do nothing;

-- Modelos das listas de execução. TÊM DE SER IGUAIS a
-- src/modules/execucao/config.ts (o servidor materializa as listas de cada
-- limpeza a partir daqui — trigger jobs_materializar_listas).
insert into exec_checklist_template (kind, ordem, label, condicao) values
  ('prep', 1, 'Confirmar acesso ao alojamento', null),
  ('prep', 2, 'Rever notas da gestora', null),
  ('prep', 3, 'Levar material de limpeza', 'material'),
  ('prep', 4, 'Levar sacos de roupa para lavandaria', 'lavandaria'),
  ('task', 1, 'Quartos: limpeza e arrumação', null),
  ('task', 2, 'Casas de banho: limpeza e desinfeção', null),
  ('task', 3, 'Cozinha: limpeza de superfícies', null),
  ('task', 4, 'Sala: limpeza e arrumação', null),
  ('task', 5, 'Repor consumíveis', null),
  ('task', 6, 'Verificar danos', null),
  ('task', 7, 'Deixar portas e janelas em segurança', null)
on conflict (kind, ordem) do nothing;

-- Itens de roupa e a chave correspondente em clients.laundry_setup.
insert into exec_laundry_template (item, ordem, chave_cliente) values
  ('lencol', 1, 'lencol'),
  ('capa',   2, 'edredon'),
  ('fronha', 3, 'fronhas'),
  ('tbanho', 4, 'banho'),
  ('trosto', 5, 'rosto')
on conflict (item) do nothing;
