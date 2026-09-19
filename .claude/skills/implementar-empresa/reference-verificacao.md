# Referência — Verificação

Usado pelo Passo 5 de `SKILL.md`. Cada secção é para ser **colada** no brief de implementação ou de revisão a que se aplica — os subagentes não leem esta skill. Os exemplos são de Postgres/Supabase; noutra plataforma, aplicar o mesmo princípio.

## A. Rever o estado vivo, não só os ficheiros

- Confirmar no sistema vivo o que os ficheiros dizem: políticas (`pg_policies`), funções e se são `security definer` (`pg_proc.prosecdef`), triggers, publicação de tempo real (`pg_publication_tables`), políticas de Storage, funções publicadas.
- Uma função chamada pelo browser: fazer o preflight (`OPTIONS` com `Origin`) contra a versão publicada e confirmar os cabeçalhos `access-control-*`, também nas respostas de erro.
- Divergência entre o sistema vivo e as migrações é um defeito, mesmo que o ficheiro esteja certo. Tudo o que existe no sistema vivo tem uma migração, incluindo `alter publication`.
- Funções chamadas pela app: `security invoker` por omissão; `definer` só com justificação escrita no relatório.
- Permissões por coluna (`GRANT`) aplicam-se ao papel da base de dados, não à pessoa. Se gestão e execução partilham o papel, os dados sensíveis vão para uma tabela própria ou são guardados por trigger.

## B. Testes de segurança que conseguem falhar

Cada verificação negativa ("X não consegue…") tem de:

1. **Correr sobre dados que existem** — semear o alvo antes e confirmar, com a sessão privilegiada, que a semente lá está. Uma tabela vazia passa sempre.
2. **Distinguir recusa de erro** — leitura negada = zero linhas *sem erro* numa tabela que se sabe ter linhas; escrita negada = o código exato esperado (ex. `42501`, `P0001`). Qualquer outro erro faz o teste falhar.
3. **Ter um controlo positivo** — quem deve ver a mesma linha, vê-a.
4. **Cobrir cada coluna protegida**, não só uma.

E o teste no seu todo tem de:

5. **Incluir uma sonda de sanidade** — uma verificação com um nome de tabela ou coluna errado de propósito, que tem de dar FALHA.
6. **Usar só dados descartáveis** — contas e linhas criadas pelo próprio teste, com um marcador, com os ids guardados assim que existem, e apagadas num `finally`. Nunca contas de pessoas reais nem credenciais fixas versionadas.
7. **Nunca alterar nem apagar o que não criou** — atenção a tabelas cuja chave primária é o id de outra entidade real (apagar a "linha de teste" apaga a real). Pedir prova de que um valor real sobrevive a uma execução.

## C. Significado dos campos

Antes de decidir o que um campo significa, procurar onde o código o lê e o escreve. Se o comentário ou o tipo disserem o contrário do uso, vale o uso — dizê-lo no relatório e corrigir o comentário.
