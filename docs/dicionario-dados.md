# Dicionario de dados

Campos customizados sugeridos para controle da importacao.

## SC5 - Cabecalho do pedido de venda

| Campo | Tipo | Tamanho | Decimal | Obrigatorio | Uso |
|---|---:|---:|---:|---|---|
| `C5_XPEDEXT` | Caracter | 30 | 0 | Sim | Codigo do pedido externo recebido do ecommerce. Usado para bloquear duplicidade. |
| `C5_XORIGEM` | Caracter | 10 | 0 | Sim | Origem do pedido. Valores esperados: `crm`, `ecommerce`, `protheus`. |

## Recomendacoes

- Criar indice em `SC5` envolvendo filial e `C5_XPEDEXT` para melhorar a validacao de duplicidade em volume.
- Marcar `C5_XPEDEXT` como pesquisavel no dicionario, se a operacao precisar localizar pedidos pelo codigo externo.
- Validar se tamanho 30 atende ao identificador real do ecommerce.
- Definir lista de opcoes para `C5_XORIGEM` no configurador:

```text
crm=CRM
ecommerce=Ecommerce
protheus=Protheus
```

## Observacao tecnica

O fonte trata a ausencia de `C5_XPEDEXT` como erro bloqueante para evitar importacao sem controle de duplicidade.
