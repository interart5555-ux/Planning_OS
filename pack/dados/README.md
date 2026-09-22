# Dados exportados

`dados-<data>.sql` é uma exportação de **todas as linhas** das tabelas do projeto Supabase da
ALClean nesse dia (esquema `public`, sem fotografias nem contas de autenticação).

**Contém dados pessoais** (nomes, emails e telefones de colaboradoras e clientes). Este pack não
deve ser partilhado nem posto em lado nenhum público por causa deste ficheiro. Se não precisas dos
dados, apaga a pasta `dados/` antes de guardar o pack.

Restaurar (só num projeto novo, depois do esquema): `instalador/restaurar-dados.sh dados/dados-<data>.sql`.
Depois, `npm run gestora:criar` liga a gestora à conta nova, e as colaboradoras recebem acesso
outra vez no módulo Equipas (o PIN antigo não sobrevive à mudança de projeto).
