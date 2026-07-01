# Demo web local

Demo web simples em Node.js para visualizar a regra de negócio do importador de pedidos com os mesmos CSVs da entrega.

Esta demo é somente uma simulação visual. Ela não executa Protheus, não chama `MSExecAuto/MATA410`, não usa AppServer/RPO e não grava tabelas reais `SC5` ou `SC6`. A rotina oficial permanece em ADVPL.

## Como executar

Na raiz do projeto:

```powershell
node demo-web\server.js
```

Depois abrir:

```text
http://localhost:3000
```

Para encerrar o servidor, usar `Ctrl+C` no terminal.

## O que a tela demonstra

- leitura de `data/pedidos_header.csv` e `data/pedidos_itens.csv`;
- validação simulada de cliente contra base SA1 local;
- validação simulada de produto contra base SB1 local;
- rejeição de quantidade e preço inválidos;
- inclusão demonstrativa em SC5/SC6 simulados;
- rejeição por duplicidade em uma segunda importação pelo campo `PedidoExterno/C5_XPEDEXT`;
- upload manual opcional de `pedidos_header.csv` e `pedidos_itens.csv` pela tela.

## Modo principal do teste

Ao clicar em **Processar pedidos do teste**, a demo limpa qualquer seleção manual e processa:

- `data/pedidos_header.csv`;
- `data/pedidos_itens.csv`.

O botão **Simular segunda importação** usa os mesmos arquivos padrão e demonstra o bloqueio de duplicidade.

## Modo manual opcional

Para testar outros arquivos sem alterar a entrega oficial:

1. abrir a área **Carregar CSV manualmente (opcional)**;
2. selecionar um arquivo no campo `pedidos_header.csv`;
3. selecionar um arquivo no campo `pedidos_itens.csv`;
4. clicar em **Processar CSV manual**.

Os dois arquivos devem ser informados juntos. Se apenas um CSV for selecionado, a tela mostra uma mensagem pedindo os dois arquivos.

## Base simulada

A base simulada de clientes contém apenas:

- filial `01`, cliente `000001`, loja `01`;
- filial `01`, cliente `000002`, loja `01`.

Por isso, o pedido `EXT-2026-0003`, que usa cliente `000003`, é rejeitado pelo motivo principal `cliente inexistente na base simulada/SA1`. Os problemas dos itens aparecem apenas como diagnóstico no log.
