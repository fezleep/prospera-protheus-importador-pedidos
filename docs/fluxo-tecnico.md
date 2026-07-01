# Fluxo tecnico

## Objetivo

Importar pedidos de venda originados no ecommerce para o Protheus, criando cabecalho e itens nas estruturas da rotina `MATA410` via `MSExecAuto`.

## Sequencia da rotina

1. Executa `U_IMPPEDIDOS()`.
2. Le `data/pedidos_header.csv` em UTF-8 usando ponto e virgula.
3. Le `data/pedidos_itens.csv` em UTF-8 usando ponto e virgula.
4. Normaliza campos principais:
   - `PedidoExterno` em maiusculo.
   - codigos de cliente, loja, produto, vendedor, condicao e tabela sem espacos.
   - quantidade, preco e desconto como numericos.
   - origem padrao `ecommerce` quando vazia.
5. Agrupa cabecalho e itens por `PedidoExterno`.
6. Valida cliente em `SA1`.
7. Valida produto em `SB1`.
8. Valida quantidade maior que zero.
9. Valida preco maior que zero.
10. Verifica duplicidade em `SC5.C5_XPEDEXT`.
11. Descarta itens invalidos e cria pedido somente se restar pelo menos um item valido.
12. Monta arrays de cabecalho e itens para `MSExecAuto`.
13. Executa inclusao via `MATA410`.
14. Registra logs por `ConOut`.
15. Emite resumo final com processados, incluidos, rejeitados e erros.

## Tratamento de rejeicoes

Rejeicoes esperadas nao interrompem toda a importacao. Exemplos:

- cliente inexistente;
- pedido sem pedido externo;
- pedido externo ja importado;
- produto inexistente;
- quantidade menor ou igual a zero;
- preco menor ou igual a zero;
- pedido sem item valido.

Pedido sem `PedidoExterno` e rejeitado antes da inclusao, porque sem esse identificador nao e possivel garantir o bloqueio de duplicidade em `SC5.C5_XPEDEXT`.

## Ponto dependente de ambiente

A assinatura e os campos minimos aceitos pela `MATA410` no `MSExecAuto` podem variar conforme release, patch, parametros e customizacoes. Por isso, a chamada esta isolada na funcao `ImpIncluiPedido()` e os arrays sao montados em `ImpMontaAuto()`.

Antes da execucao produtiva, validar no ambiente alvo:

- assinatura da `MATA410` usada pelo `MSExecAuto`;
- obrigatoriedade de campos adicionais no cabecalho ou item;
- regras fiscais, TES, natureza, armazem, tabela de preco e condicao de pagamento;
- comportamento de numeracao do pedido;
- permissoes do usuario de execucao.
