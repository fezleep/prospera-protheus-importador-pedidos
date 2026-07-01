# Roteiro para video

Tempo-alvo: ate 3 minutos.

## Versao usando demo web local

Esta versao deve ser usada quando nao houver ambiente Protheus local para compilar e executar a rotina ADVPL. A demo web mostra visualmente a regra de negocio com os CSVs do teste, mas nao substitui a execucao real no Protheus.

## 1. Mostrar fonte ADVPL oficial

Tempo sugerido: 25 segundos.

Mostrar:

- `src/u_imp_pedidos.prw`
- `U_IMPPEDIDOS()` como entrada principal;
- leitura dos CSVs;
- validacao de cliente/produto;
- bloqueio de duplicidade por `SC5.C5_XPEDEXT`;
- montagem para `MSExecAuto/MATA410`.

Mensagem sugerida:

```text
A entrega oficial e esta rotina ADVPL. Ela le pedidos por CSV, valida dados mestres e valores, bloqueia duplicidade pelo pedido externo e prepara a inclusao via MATA410/MSExecAuto.
```

## 2. Mostrar dicionario C5_XPEDEXT e C5_XORIGEM

Tempo sugerido: 20 segundos.

Abrir `docs/dicionario-dados.md` e destacar:

- `C5_XPEDEXT` para gravar o pedido externo e controlar duplicidade;
- `C5_XORIGEM` para identificar a origem do pedido;
- recomendacao de indice envolvendo filial e pedido externo.

Mensagem sugerida:

```text
Antes da execucao em Protheus, estes campos precisam existir no dicionario. O campo C5_XPEDEXT e o ponto de controle para evitar reimportacao do mesmo pedido externo.
```

## 3. Abrir demo-web no navegador

Tempo sugerido: 20 segundos.

Executar na raiz do projeto:

```powershell
node demo-web\server.js
```

Abrir:

```text
http://localhost:3000
```

Mensagem sugerida:

```text
Como nao ha AppServer e RPO local nesta gravacao, uso uma demo web local em Node.js para visualizar a regra de negocio. Ela nao executa Protheus; apenas simula o fluxo com os mesmos CSVs.
```

## 4. Processar pedidos

Tempo sugerido: 25 segundos.

Na tela, clicar em `processar pedidos`.

Mostrar:

- leitura de `data/pedidos_header.csv`;
- leitura de `data/pedidos_itens.csv`;
- totais de pedidos lidos, importados, rejeitados e itens rejeitados;
- logs em estilo `ConOut`.

Mensagem sugerida:

```text
Ao processar, a demo carrega os dois CSVs, valida cliente, produto, quantidade e preco, e monta uma saida simulada para os pedidos aceitos.
```

## 5. Mostrar pedidos aceitos e rejeitados

Tempo sugerido: 30 segundos.

Na tabela de status, destacar:

- `EXT-2026-0001` incluido;
- `EXT-2026-0002` incluido com diagnostico de item rejeitado por produto invalido;
- `EXT-2026-0003` rejeitado por cliente inexistente na base simulada/SA1;
- diagnosticos dos itens invalidos do `EXT-2026-0003` por quantidade e preco invalidos.

Mensagem sugerida:

```text
O pedido EXT-2026-0003 usa o cliente 000003, que nao existe na base simulada de SA1. Mesmo havendo itens invalidos, o motivo principal da rejeicao do pedido e cliente inexistente.
```

## 6. Mostrar SC5/SC6 simulados

Tempo sugerido: 25 segundos.

Mostrar as tabelas:

- `SC5 simulado`, com pedido interno simulado, pedido externo, cliente, origem e emissao;
- `SC6 simulado`, com pedido interno simulado, item, produto, quantidade e preco.

Mensagem sugerida:

```text
Estas tabelas nao sao tabelas Protheus reais. Elas apenas mostram, na demonstracao, quais cabecalhos e itens passaram pelas validacoes.
```

## 7. Simular segunda importacao e mostrar duplicidade

Tempo sugerido: 25 segundos.

Clicar em `simular segunda importacao`.

Mostrar nos logs:

- rejeicao por duplicidade dos pedidos ja incluidos;
- referencia a `PedidoExterno/C5_XPEDEXT`;
- manutencao da rejeicao do `EXT-2026-0003` por cliente inexistente.

Mensagem sugerida:

```text
Na segunda importacao, os pedidos ja aceitos sao rejeitados por duplicidade usando o pedido externo, que corresponde ao controle C5_XPEDEXT definido no dicionario.
```

## 8. Explicar dependencia de Protheus real

Tempo sugerido: 20 segundos.

Explicar:

- a validacao final depende de AppServer configurado;
- o fonte precisa ser compilado no RPO;
- os campos do dicionario precisam existir;
- clientes, produtos, condicao de pagamento, tabela de preco e vendedor precisam estar cadastrados;
- a chamada `MSExecAuto/MATA410` pode exigir ajuste conforme release, patch, parametros e regras fiscais do ambiente.

Mensagem sugerida:

```text
Esta gravacao demonstra a regra de negocio localmente e mostra o fonte ADVPL oficial. A validacao final em Protheus depende de ambiente configurado com AppServer, RPO, dicionario e cadastros.
```

## Encerramento

Tempo sugerido: 10 segundos.

Mensagem sugerida:

```text
A entrega oficial continua sendo ADVPL com documentacao. A demo web local e somente um apoio visual para apresentar as validacoes quando nao ha ambiente Protheus disponivel.
```
