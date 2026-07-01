# Demonstracao local

Esta pasta contem um simulador simples em Python para demonstrar a regra de negocio da importacao usando os mesmos CSVs da entrega ADVPL.

O demo-local nao substitui o Protheus, nao executa `MSExecAuto` e nao grava nas tabelas reais `SC5` e `SC6`. Ele serve apenas para mostrar, em ambiente local, como os arquivos de teste sao lidos, validados e transformados em uma saida simulada.

## Como executar

Na raiz do projeto:

```powershell
python demo-local\run_demo.py
```

Se o comando `python` nao estiver disponivel no ambiente Windows, use:

```powershell
py demo-local\run_demo.py
```

## O que o simulador faz

- Le `data/pedidos_header.csv`.
- Le `data/pedidos_itens.csv`.
- Usa uma base simulada interna de clientes e produtos.
- Opcionalmente le `demo-local/clientes_seed.csv` e `demo-local/produtos_seed.csv`, se esses arquivos existirem.
- Valida cliente existente.
- Valida produto existente.
- Valida quantidade maior que zero.
- Valida preco maior que zero.
- Rejeita pedido sem `PedidoExterno`.
- Rejeita pedido duplicado.
- Cria pedido somente quando existe pelo menos um item valido.
- Imprime logs no terminal em formato parecido com `ConOut`.
- Gera resumo final.
- Gera `demo-local/output/sc5_simulado.csv` e `demo-local/output/sc6_simulado.csv`.
- Executa uma segunda importacao simulada no final para demonstrar o bloqueio de duplicidade.

## Arquivos gerados

Os arquivos abaixo sao demonstrativos:

- `demo-local/output/sc5_simulado.csv`
- `demo-local/output/sc6_simulado.csv`

Eles representam uma aproximacao das informacoes que seriam montadas para cabecalho e itens do pedido. A inclusao real em `SC5` e `SC6` depende de ambiente Protheus configurado, AppServer, RPO, dicionario, cadastros e regras da rotina `MATA410`.

## Entrega oficial

A entrega oficial continua sendo o fonte ADVPL em `src/u_imp_pedidos.prw` e a documentacao do projeto. Esta demonstracao local existe apenas para apoiar apresentacao e validacao visual da regra de negocio sem ambiente Protheus local.
