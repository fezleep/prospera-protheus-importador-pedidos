# Checklist de testes

## Preparacao

- [ ] Campos `C5_XPEDEXT` e `C5_XORIGEM` criados no dicionario.
- [ ] Arquivos `data/pedidos_header.csv` e `data/pedidos_itens.csv` disponiveis para o AppServer.
- [ ] Clientes do CSV cadastrados em `SA1`.
- [ ] Produtos do CSV cadastrados em `SB1`.
- [ ] Condicao de pagamento, tabela de preco e vendedor validos no ambiente.
- [ ] `MATA410` liberada para uso via `MSExecAuto`.

## Casos obrigatorios

- [ ] Importar pedido com cliente valido, produto valido, quantidade positiva e preco positivo.
- [ ] Rejeitar pedido sem `PedidoExterno`.
- [ ] Rejeitar pedido com cliente inexistente.
- [ ] Rejeitar item com produto inexistente.
- [ ] Rejeitar item com quantidade igual a zero.
- [ ] Rejeitar item com quantidade negativa.
- [ ] Rejeitar item com preco igual a zero.
- [ ] Rejeitar item com preco negativo.
- [ ] Criar pedido quando houver pelo menos um item valido e outros itens invalidos.
- [ ] Rejeitar pedido quando todos os itens forem invalidos.
- [ ] Rejeitar segunda importacao do mesmo `PedidoExterno`.
- [ ] Registrar resumo final no `ConOut`.
- [ ] Tratar ausencia de `C5_XPEDEXT` no dicionario como bloqueio da importacao.

## Evidencias esperadas

- Log de inicio e fim da rotina.
- Log de leitura dos dois CSVs.
- Log por pedido externo processado.
- Log de rejeicao por regra violada.
- Log de erro quando `MSExecAuto/MATA410` retornar falha.
- Pedido criado em `SC5/SC6` com `C5_XPEDEXT` preenchido.
