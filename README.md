# Importador de pedidos ecommerce para Protheus

Entrega tecnica em ADVPL para importar pedidos de venda recebidos em CSV por uma distribuidora de pneus.

A rotina le os arquivos `data/pedidos_header.csv` e `data/pedidos_itens.csv`, valida clientes, produtos, valores e duplicidade pelo pedido externo, e monta os arrays para inclusao de pedido de venda via `MSExecAuto` com `MATA410`.

## Estrutura

```text
README.md
src/u_imp_pedidos.prw
data/pedidos_header.csv
data/pedidos_itens.csv
demo-local/run_demo.py
demo-local/README.md
demo-local/output/sc5_simulado.csv
demo-local/output/sc6_simulado.csv
demo-web/server.js
demo-web/README.md
demo-web/public/index.html
demo-web/public/styles.css
demo-web/public/app.js
docs/dicionario-dados.md
docs/fluxo-tecnico.md
docs/checklist-testes.md
docs/roteiro-video.md
exemplos/logs-execucao.txt
```

## Premissas de ambiente

- Ambiente Protheus com modulo Faturamento e rotina `MATA410` disponiveis.
- Tabelas `SA1`, `SB1`, `SC5` e `SC6` existentes e acessiveis pelo ambiente da rotina.
- Campos customizados `C5_XPEDEXT` e `C5_XORIGEM` criados no dicionario antes da execucao.
- O indice padrao usado para `SA1` deve localizar por filial + cliente + loja.
- O indice padrao usado para `SB1` deve localizar por filial + produto.
- A chamada `MSExecAuto` da `MATA410` pode variar conforme release, patch e configuracao local. O fonte deixa esse ponto isolado na funcao `ImpIncluiPedido()` para ajuste fino no ambiente alvo.
- A leitura UTF-8 considera funcoes padrao do AppServer para conversao de texto. Caso o ambiente use encoding diferente no filesystem, validar a conversao antes do teste.

## Layout dos CSVs

### `data/pedidos_header.csv`

Separador: ponto e virgula.

```csv
PedidoExterno;Filial;Emissao;Cliente;Loja;CondPag;TabelaPreco;Vendedor;Obs;Origem
EXT-2026-0001;01;19/01/2026;000001;01;001;001;000001;Pedido canal externo - entrega normal;ecommerce
```

### `data/pedidos_itens.csv`

Separador: ponto e virgula.

```csv
PedidoExterno;Item;Produto;Quantidade;PrecoUnit;DescontoPerc
EXT-2026-0001;001;PNEU1757013;4;289.90;0
```

## Como executar

1. Criar os campos customizados descritos em `docs/dicionario-dados.md`.
2. Compilar `src/u_imp_pedidos.prw` no RPO do ambiente de teste.
3. Disponibilizar os arquivos CSV no diretorio `data/` acessivel pelo AppServer.
4. Executar a user function:

```advpl
U_IMPPEDIDOS()
```

## Saida esperada

A rotina registra progresso, rejeicoes, erros e resumo final usando `ConOut`. O arquivo `exemplos/logs-execucao.txt` e ilustrativo e mostra o formato esperado; a saida real depende dos dados, cadastros e regras do ambiente Protheus.

## Demonstracao local sem ambiente Protheus

A pasta `demo-local/` contem um simulador simples em Python para demonstrar a regra de negocio com os mesmos arquivos CSV de teste. Ele existe apenas para apoio em apresentacao local quando nao ha AppServer, RPO e ambiente Protheus disponiveis.

O simulador:

- le `data/pedidos_header.csv` e `data/pedidos_itens.csv`;
- usa uma base simulada de clientes e produtos;
- valida cliente, produto, quantidade, preco, pedido externo e duplicidade;
- cria pedido apenas quando existe pelo menos um item valido;
- imprime logs no terminal em formato parecido com `ConOut`;
- gera `demo-local/output/sc5_simulado.csv` e `demo-local/output/sc6_simulado.csv`;
- executa uma segunda importacao simulada para mostrar o bloqueio de duplicidade.

Execucao local:

```powershell
python demo-local\run_demo.py
```

Se necessario:

```powershell
py demo-local\run_demo.py
```

Importante: `demo-local` nao substitui Protheus, nao executa `MSExecAuto/MATA410` e nao grava tabelas reais `SC5` ou `SC6`. A execucao real depende de ambiente Protheus configurado, dicionario, cadastros, AppServer e RPO.

## Demo web local

A pasta `demo-web/` contem uma aplicacao local simples em Node.js para visualizar a mesma regra de negocio em uma tela web, facilitando a gravacao do video quando nao ha ambiente Protheus/AppServer/RPO disponivel.

A demo web:

- le `data/pedidos_header.csv` e `data/pedidos_itens.csv`;
- mostra totais de pedidos lidos, importados, rejeitados e itens rejeitados;
- exibe o status de cada pedido;
- exibe tabelas simuladas de `SC5` e `SC6`;
- mostra logs em estilo `ConOut`;
- permite processar pedidos, simular segunda importacao e limpar o resultado;
- demonstra duplicidade pelo par `PedidoExterno/C5_XPEDEXT`.

Execucao local:

```powershell
node demo-web\server.js
```

Depois abrir:

```text
http://localhost:3000
```

Para encerrar, pressionar `Ctrl+C` no terminal.

Importante: `demo-web` e uma simulacao visual da regra de negocio. Ela nao executa Protheus, nao chama `MSExecAuto/MATA410`, nao usa AppServer/RPO e nao grava tabelas reais `SC5` ou `SC6`.

## Escopo

Esta entrega oficial continua sendo a rotina ADVPL e a documentacao tecnica. As pastas `demo-local/` e `demo-web/` sao apenas apoios locais de demonstracao quando nao ha ambiente Protheus disponivel. O projeto nao usa TLPP e nao adiciona dependencias externas obrigatorias.
