# Dashboard de Plantão

Aplicação para cadastrar uma equipe fictícia, gerar escalas mensais, ajustar substituições, exportar calendário e calcular o fechamento por pessoa. Backend Node.js/Express/SQLite e interface HTML/CSS/JavaScript.

## Executar

Requer Node.js 20.20 ou posterior na linha 20, conforme `package.json`.

```sh
npm ci
npm start
```

Abra http://localhost:3000. Os cadastros e escalas começam vazios. Não há banco, imagem de escala real ou cadastro de equipe nesta edição.

## Configuração

| Variável | Padrão | Uso |
| --- | --- | --- |
| `PORT` | `3000` | Porta local |
| `DB_PATH` | `./data/plantao.sqlite` | Banco criado durante a execução, ignorado pelo Git |
| `BASE_PATH` | `/` | Prefixo quando usado atrás de reverse proxy |
| `NODE_ENV` | desenvolvimento | Configure `production` na hospedagem |

A aplicação não tem autenticação própria. Uma instalação com dados persistidos deve ter controle de acesso na camada de hospedagem/rede. O backup JSON contém os dados cadastrados e deve permanecer local, em `backups/` ou `private-data/`.

## Escalas e fechamento

A geração respeita disponibilidade, evita dias consecutivos e busca equilibrar os turnos. A edição manual permite revisar conflitos; dias sem responsável ficam identificados. O fechamento usa valores inteiros em centavos e preserva a tabela salva em cada mês.

Os valores iniciais são **fictícios e editáveis**: dia útil R$ 25, sexta R$ 50, sábado R$ 75, domingo R$ 100 e feriado R$ 125. São exemplos para experimentar a aplicação; não representam política ou remuneração de nenhuma empresa. O feriado tem precedência sobre o dia da semana.

O calendário pode ser exportado como XLSX/PNG e o fechamento como XLSX. Os arquivos gerados podem conter dados pessoais informados pelo operador e não devem ser versionados.

## Testes e dependências

```sh
npm test
npm audit
```

Fixtures de testes são sintéticas, inclusive cidades e valores. ExcelJS mantém um override restrito de `uuid` para a versão 11.1.1, que preserva a API CommonJS usada pela biblioteca e corrige o aviso de limites de buffer. A exportação e a leitura de planilhas são verificadas pela suíte.

## Docker

```sh
docker compose up -d --build
```

O banco fica no volume `plantao-data`, separado da imagem. Para uso sob um prefixo, configure `BASE_PATH` e o reverse proxy com o mesmo caminho, removendo esse prefixo ao encaminhar ao app. Configure a barreira de acesso antes de disponibilizar uma instalação com dados.

Leia [PUBLICATION.md](PUBLICATION.md) para os arquivos locais ignorados e a revisão antes de publicação. Planos internos, logotipos de terceiros e imagens de equipes reais não acompanham esta edição.
