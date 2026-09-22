# Ponto de situação

*Atualizado a 21 de setembro de 2026.*

## Onde estamos

| Frente | Estado |
|---|---|
| Template AppOS (este repositório) | Protótipo sem servidor. Skills de personalização completas, com retrospetiva e registo de melhoria contínua. Nada do backend da ALClean voltou para cá. |
| Procedimento | `personalizar-empresa` → `personalizar-modulo` → `implementar-empresa`. As regras M-001 a M-007 estão aplicadas; M-008 a M-018 estão registadas como propostas. |
| ALClean (`../alclean/app`, branch `fase2-backend`) | Fase 2 concluída: 16 tarefas, 29 migrações, teste de segurança com 236 verificações, publicada e testada no site pelo utilizador. Falta juntar ao `main`. |
| Decisões de arquitetura | Em aberto: produto único multi-empresa ou uma instalação por empresa; stack; canal de comunicação com o cliente. |

## ALClean — o que ficou feito

- Os sete módulos validados ligados a dados reais (Supabase), com autenticação, papéis e proteção ao
  nível da linha.
- Um módulo novo, fora do plano inicial: dados da empresa (nome, tolerâncias, deslocações),
  editáveis na app em vez de fixos no código.
- As falhas críticas da auditoria de 19 de setembro foram fechadas durante a execução: suspender o
  acesso passou a cortar mesmo no servidor, o Planeamento deixou de desfazer limpezas concluídas, as
  dez tabelas de tempo real entraram em migração, e o histórico ficou protegido.
- O teste de segurança cresceu de 43 para 236 verificações, com controlos positivos que já apanharam
  erros do próprio teste.

## ALClean — o que falta

- Juntar `fase2-backend` ao `main` depois do teste no site com duas sessões.
- Lacunas de produto declaradas: nenhuma ação cria faturas, e a importação de reservas continua fora
  de âmbito, pelo que as limpezas nascem à mão ou do script de demonstração.
- `job_assignments` sem guarda de atualização: mudar a pessoa ou as horas de uma limpeza concluída
  faz o mesmo estrago que apagá-la.
- Pendentes da auditoria que continuam abertos: autenticação fraca (código de seis dígitos com email
  previsível), minimização de dados pessoais, retenção e exportação (RGPD), backups e ambientes
  separados, e os controlos automáticos de qualidade (tipos, análise estática, testes, CI).

## Documentos de referência

| Para quê | Ficheiro |
|---|---|
| Recomeçar do zero sem o código atual | `docs/brief-reconstrucao-appos-alclean.md` |
| Passar o aprendizado a outro agente | `docs/briefing-codex.md` |
| Achados por nível e decisões pedidas | `docs/auditoria-2026-09-19.md` |
| Explicar as melhorias a quem não é técnico | `docs/melhorias-procedimento-resumo.md` |
| Lições que mudam o procedimento | `docs/superpowers/melhoria-continua.md` |
| Registo da execução da Fase 2 | `.superpowers/sdd/2026-09-18-alclean-fase2-backend/progress.md` |

## Próximo passo acordado

Terminar a versão de teste da ALClean (publicar e testar no site). Depois, revisão completa do
procedimento para replicação, a partir da auditoria e das propostas M-008 a M-018, incluindo a
decisão de arquitetura. Só então começa código novo.
