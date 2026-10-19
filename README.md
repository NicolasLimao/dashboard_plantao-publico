# Dashboard de Plantão

Aplicação para organizar escalas mensais de uma equipe, revisar substituições e calcular o fechamento financeiro por pessoa. A interface reúne cadastro, calendário, regras de distribuição, exportações e backup; o backend persiste os dados em SQLite.

O projeto permite acompanhar o ciclo completo de uma escala: cadastrar a equipe, gerar o mês, ajustar a distribuição, conferir conflitos e exportar o resultado. Esta edição começa com banco vazio e usa valores fictícios de demonstração.

## Funcionalidades

- Cadastro de analistas e suas disponibilidades.
- Geração de escalas mensais, evitando dias consecutivos e buscando equilíbrio dos turnos.
- Revisão do calendário e substituição manual com indicação de conflitos.
- Fechamento por analista e total do mês, com valores inteiros em centavos.
- Tabela editável por tipo de dia e precedência de feriado.
- Exportação do calendário em XLSX/PNG e do fechamento em XLSX.
- Importação e exportação de backup JSON.

## Tecnologias e arquitetura

| Camada     | Tecnologias                     |
| ---------- | ------------------------------- |
| Interface  | HTML, CSS e JavaScript          |
| Backend    | Node.js, Express                |
| Banco      | SQLite com better-sqlite3       |
| Exportação | ExcelJS e html2canvas           |
| Testes     | Vitest, Supertest e jsdom       |
| Execução   | Node.js local ou Docker Compose |

A API separa rotas, acesso ao banco, geração da escala, cálculo do fechamento e exportação. As regras de datas e dinheiro ficam em módulos próprios, usados pelos serviços e cobertos por testes.

## Instalação

Requisitos: Git, npm e Node.js 20.20 ou posterior na linha 20, conforme `package.json`.

```sh
git clone https://github.com/NicolasLimao/dashboard_plantao-publico.git
cd dashboard_plantao-publico
npm ci
npm start
```

Abra **http://localhost:3000**. O banco é criado durante a execução. Nenhuma base, escala preenchida ou equipe real acompanha o código.

## Primeiro uso

1. Cadastre analistas fictícios e suas disponibilidades.
2. Gere uma escala para o mês desejado e revise os dias sem responsável ou em conflito.
3. Ajuste substituições no calendário quando necessário.
4. Confira a tabela de valores e o fechamento individual e geral.
5. Exporte o calendário, a planilha de fechamento ou um backup local.

### Valores de demonstração

| Tipo de dia | Valor inicial fictício |
| ----------- | ---------------------- |
| Dia útil    | R$ 25,00               |
| Sexta       | R$ 50,00               |
| Sábado      | R$ 75,00               |
| Domingo     | R$ 100,00              |
| Feriado     | R$ 125,00              |

Esses valores são editáveis e não representam política ou remuneração de uma empresa. O fechamento preserva a tabela salva em cada mês; feriado tem precedência sobre o dia da semana. O cálculo usa centavos inteiros, convertidos para reais na exibição e na exportação.

## Configuração

| Variável    | Padrão                              | Finalidade                        |
| ----------- | ----------------------------------- | --------------------------------- |
| `PORT`      | `3000`                              | Porta do serviço                  |
| `DB_PATH`   | `./data/plantao.sqlite`             | Caminho do banco local            |
| `BASE_PATH` | `/`                                 | Prefixo público sob reverse proxy |
| `NODE_ENV`  | Desenvolvimento quando não definido | Modo de execução                  |

As variáveis são fornecidas ao processo ou pelo Docker Compose. O diretório do banco, backups e exportações são dados locais, separados do código versionado.

### Docker

Requer Docker e Docker Compose:

```sh
docker compose up -d --build
```

A interface fica em **http://localhost:3000** e o banco no volume `plantao-data`, separado da imagem. Para hospedar sob um prefixo, configure `BASE_PATH` e o reverse proxy de forma consistente, removendo o prefixo ao encaminhar para o app.

## Estrutura

```text
public/          interface e módulos JavaScript do navegador
src/routes/      endpoints HTTP
src/db/          esquema e repositórios SQLite
src/scheduling/  geração, datas e substituições
src/closing/     regras de valores e fechamento
src/export/      geração de planilhas
src/server.js    inicialização do serviço e banco
tests/           cenários de API, regras, interface e exportação
```

## Testes

```sh
npm test
npm audit
```

Para executar a suíte continuamente durante o desenvolvimento:

```sh
npm run test:watch
```

Os testes usam fixtures fictícias e verificam geração, substituição, cálculo, persistência, rotas e leitura das planilhas exportadas. O projeto mantém um override restrito de `uuid` para preservar a integração CommonJS do ExcelJS; o contrato de exportação é coberto pela suíte.

## Limitações e dados locais

A aplicação não possui autenticação própria. Uma instalação com dados persistidos exige controle de acesso na hospedagem ou na rede. A geração automática precisa de revisão: disponibilidades incompatíveis podem deixar dias sem responsável, e a interface permite conferir esses casos.

O backup JSON e as exportações podem conter os dados cadastrados pelo operador. Mantenha-os em `backups/`, `exports/` ou `private-data/`, fora do Git. Imagens de equipes reais, logotipos e planos internos não acompanham esta edição.

## Documentação e pontos de entrada

- [Rotas e montagem da aplicação](src/app.js)
- [Geração da escala](src/scheduling/generateSchedule.js)
- [Cálculo do fechamento](src/closing/computeClosing.js)
- [Configuração Docker](docker-compose.yml)
- [Dados locais e política da edição pública](PUBLICATION.md)

Desenvolvido por [NicolasLimao](https://github.com/NicolasLimao).
