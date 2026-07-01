from __future__ import annotations

import csv
from collections import defaultdict
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT_DIR / "data"
OUTPUT_DIR = Path(__file__).resolve().parent / "output"

HEADER_CSV = DATA_DIR / "pedidos_header.csv"
ITENS_CSV = DATA_DIR / "pedidos_itens.csv"
CLIENTES_SEED_CSV = Path(__file__).resolve().parent / "clientes_seed.csv"
PRODUTOS_SEED_CSV = Path(__file__).resolve().parent / "produtos_seed.csv"


@dataclass(frozen=True)
class Resultado:
    status: str
    motivo: str = ""


def log(mensagem: str) -> None:
    print(f"[IMP_PEDIDOS_DEMO] {mensagem}")


def ler_csv(caminho: Path) -> list[dict[str, str]]:
    if not caminho.exists():
        raise FileNotFoundError(f"arquivo nao encontrado: {caminho}")

    with caminho.open("r", encoding="utf-8-sig", newline="") as arquivo:
        leitor = csv.DictReader(arquivo, delimiter=";")
        linhas = [{normalizar_chave(k): (v or "").strip() for k, v in linha.items()} for linha in leitor]

    log(f"CSV lido: {caminho.relative_to(ROOT_DIR)} | registros: {len(linhas)}")
    return linhas


def normalizar_chave(chave: str | None) -> str:
    return (chave or "").strip().upper()


def normalizar_pedido_externo(valor: str) -> str:
    return valor.strip().upper()


def decimal_br(valor: str) -> Decimal:
    texto = (valor or "").strip()
    if "," in texto:
        texto = texto.replace(".", "").replace(",", ".")

    try:
        return Decimal(texto)
    except (InvalidOperation, ValueError):
        return Decimal("0")


def carregar_clientes() -> set[tuple[str, str, str]]:
    if CLIENTES_SEED_CSV.exists():
        linhas = ler_csv(CLIENTES_SEED_CSV)
        return {
            (linha.get("FILIAL", ""), linha.get("CLIENTE", ""), linha.get("LOJA", ""))
            for linha in linhas
        }

    return {
        ("01", "000001", "01"),
        ("01", "000002", "01"),
    }


def carregar_produtos() -> set[tuple[str, str]]:
    if PRODUTOS_SEED_CSV.exists():
        linhas = ler_csv(PRODUTOS_SEED_CSV)
        return {
            (linha.get("FILIAL", ""), linha.get("PRODUTO", "").upper())
            for linha in linhas
        }

    return {
        ("01", "PNEU1757013"),
        ("01", "PNEU1856515"),
        ("01", "SERVMONTAG"),
    }


def agrupar_itens(itens: list[dict[str, str]]) -> dict[str, list[dict[str, str]]]:
    agrupados: dict[str, list[dict[str, str]]] = defaultdict(list)

    for item in itens:
        pedido_externo = normalizar_pedido_externo(item.get("PEDIDOEXTERNO", ""))
        item["PEDIDOEXTERNO"] = pedido_externo
        item["ITEM"] = item.get("ITEM", "").zfill(3)
        item["PRODUTO"] = item.get("PRODUTO", "").strip().upper()
        agrupados[pedido_externo].append(item)

    return agrupados


def validar_item(
    filial: str,
    item: dict[str, str],
    produtos: set[tuple[str, str]],
) -> list[str]:
    erros: list[str] = []
    produto = item.get("PRODUTO", "")
    quantidade = decimal_br(item.get("QUANTIDADE", ""))
    preco = decimal_br(item.get("PRECOUNIT", ""))

    if not produto or (filial, produto) not in produtos:
        erros.append(f"produto invalido: {produto}")

    if quantidade <= 0:
        erros.append("quantidade menor ou igual a zero")

    if preco <= 0:
        erros.append("preco menor ou igual a zero")

    return erros


def processar_pedido(
    cabecalho: dict[str, str],
    itens_por_pedido: dict[str, list[dict[str, str]]],
    clientes: set[tuple[str, str, str]],
    produtos: set[tuple[str, str]],
    pedidos_importados: set[tuple[str, str]],
    sc5: list[dict[str, str]],
    sc6: list[dict[str, str]],
) -> Resultado:
    pedido_externo = normalizar_pedido_externo(cabecalho.get("PEDIDOEXTERNO", ""))
    cabecalho["PEDIDOEXTERNO"] = pedido_externo
    filial = cabecalho.get("FILIAL", "").strip()
    cliente = cabecalho.get("CLIENTE", "").strip()
    loja = cabecalho.get("LOJA", "").strip()

    log(f"Pedido externo: {pedido_externo or '<VAZIO>'}")

    if not pedido_externo:
        log("REJEITADO Pedido sem PedidoExterno no cabecalho")
        return Resultado("REJEITADO", "Pedido externo vazio")

    if (filial, pedido_externo) in pedidos_importados:
        log(f"REJEITADO {pedido_externo} | duplicidade em SC5.C5_XPEDEXT")
        return Resultado("REJEITADO", "Duplicidade")

    itens = itens_por_pedido.get(pedido_externo, [])
    if (filial, cliente, loja) not in clientes:
        log(f"REJEITADO {pedido_externo} | cliente inexistente na base simulada/SA1")
        for item in itens:
            erros = validar_item(filial, item, produtos)
            if erros:
                log(f"DIAGNOSTICO ITEM {pedido_externo}/{item.get('ITEM', '')} | {', '.join(erros)}")
        return Resultado("REJEITADO", "Cliente inexistente na base simulada/SA1")

    itens_validos: list[dict[str, str]] = []
    for item in itens:
        erros = validar_item(filial, item, produtos)
        if erros:
            log(f"REJEICAO ITEM {pedido_externo}/{item.get('ITEM', '')} | {', '.join(erros)}")
        else:
            itens_validos.append(item)

    if not itens_validos:
        log(f"REJEITADO {pedido_externo} | nenhum item valido para inclusao")
        return Resultado("REJEITADO", "Sem item valido")

    numero_pedido = f"SIM{len(sc5) + 1:06d}"
    sc5.append(
        {
            "C5_FILIAL": filial,
            "C5_NUM": numero_pedido,
            "C5_EMISSAO": cabecalho.get("EMISSAO", ""),
            "C5_CLIENTE": cliente,
            "C5_LOJACLI": loja,
            "C5_CONDPAG": cabecalho.get("CONDPAG", ""),
            "C5_TABELA": cabecalho.get("TABELAPRECO", ""),
            "C5_VEND1": cabecalho.get("VENDEDOR", ""),
            "C5_XPEDEXT": pedido_externo,
            "C5_XORIGEM": cabecalho.get("ORIGEM", "ecommerce") or "ecommerce",
            "C5_MENNOTA": cabecalho.get("OBS", ""),
        }
    )

    for item in itens_validos:
        sc6.append(
            {
                "C6_FILIAL": filial,
                "C6_NUM": numero_pedido,
                "C6_ITEM": item.get("ITEM", ""),
                "C6_PRODUTO": item.get("PRODUTO", ""),
                "C6_QTDVEN": str(decimal_br(item.get("QUANTIDADE", ""))),
                "C6_PRCVEN": str(decimal_br(item.get("PRECOUNIT", ""))),
                "C6_DESCONT": str(decimal_br(item.get("DESCONTOPERC", "0"))),
                "C6_XPEDEXT": pedido_externo,
            }
        )

    pedidos_importados.add((filial, pedido_externo))
    log(f"INCLUIDO {pedido_externo} | pedido simulado: {numero_pedido} | itens validos: {len(itens_validos)}")
    return Resultado("INCLUIDO")


def processar_lote(
    cabecalhos: list[dict[str, str]],
    itens_por_pedido: dict[str, list[dict[str, str]]],
    clientes: set[tuple[str, str, str]],
    produtos: set[tuple[str, str]],
    pedidos_importados: set[tuple[str, str]],
    sc5: list[dict[str, str]],
    sc6: list[dict[str, str]],
    titulo: str,
) -> dict[str, int]:
    resumo = {"processados": 0, "incluidos": 0, "rejeitados": 0, "erros": 0}
    log(titulo)

    for cabecalho in cabecalhos:
        resumo["processados"] += 1
        try:
            resultado = processar_pedido(
                cabecalho.copy(),
                itens_por_pedido,
                clientes,
                produtos,
                pedidos_importados,
                sc5,
                sc6,
            )
            if resultado.status == "INCLUIDO":
                resumo["incluidos"] += 1
            elif resultado.status == "ERRO":
                resumo["erros"] += 1
            else:
                resumo["rejeitados"] += 1
        except Exception as exc:
            resumo["erros"] += 1
            log(f"ERRO inesperado | {exc}")

    log("Resumo do lote")
    log(f"Processados: {resumo['processados']}")
    log(f"Incluidos: {resumo['incluidos']}")
    log(f"Rejeitados: {resumo['rejeitados']}")
    log(f"Erros: {resumo['erros']}")
    return resumo


def salvar_csv(caminho: Path, campos: list[str], linhas: list[dict[str, str]]) -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    with caminho.open("w", encoding="utf-8", newline="") as arquivo:
        escritor = csv.DictWriter(arquivo, fieldnames=campos, delimiter=";")
        escritor.writeheader()
        escritor.writerows(linhas)

    log(f"Arquivo gerado: {caminho.relative_to(ROOT_DIR)} | registros: {len(linhas)}")


def main() -> None:
    log("Inicio da demonstracao local")
    log("Aviso: simulacao local da regra de negocio; nao executa Protheus, AppServer, RPO ou MSExecAuto.")

    cabecalhos = ler_csv(HEADER_CSV)
    itens = ler_csv(ITENS_CSV)
    clientes = carregar_clientes()
    produtos = carregar_produtos()
    itens_por_pedido = agrupar_itens(itens)

    log(f"Base simulada de clientes: {len(clientes)} registros")
    log(f"Base simulada de produtos: {len(produtos)} registros")

    pedidos_importados: set[tuple[str, str]] = set()
    sc5: list[dict[str, str]] = []
    sc6: list[dict[str, str]] = []

    resumo_1 = processar_lote(
        cabecalhos,
        itens_por_pedido,
        clientes,
        produtos,
        pedidos_importados,
        sc5,
        sc6,
        "Primeira importacao simulada",
    )

    salvar_csv(
        OUTPUT_DIR / "sc5_simulado.csv",
        [
            "C5_FILIAL",
            "C5_NUM",
            "C5_EMISSAO",
            "C5_CLIENTE",
            "C5_LOJACLI",
            "C5_CONDPAG",
            "C5_TABELA",
            "C5_VEND1",
            "C5_XPEDEXT",
            "C5_XORIGEM",
            "C5_MENNOTA",
        ],
        sc5,
    )
    salvar_csv(
        OUTPUT_DIR / "sc6_simulado.csv",
        [
            "C6_FILIAL",
            "C6_NUM",
            "C6_ITEM",
            "C6_PRODUTO",
            "C6_QTDVEN",
            "C6_PRCVEN",
            "C6_DESCONT",
            "C6_XPEDEXT",
        ],
        sc6,
    )

    resumo_2 = processar_lote(
        cabecalhos,
        itens_por_pedido,
        clientes,
        produtos,
        pedidos_importados,
        sc5,
        sc6,
        "Segunda importacao simulada para demonstrar duplicidade",
    )

    log("Resumo final da demonstracao")
    log(f"Primeira importacao | incluidos: {resumo_1['incluidos']} | rejeitados: {resumo_1['rejeitados']} | erros: {resumo_1['erros']}")
    log(f"Segunda importacao | incluidos: {resumo_2['incluidos']} | rejeitados: {resumo_2['rejeitados']} | erros: {resumo_2['erros']}")
    log(f"SC5 simulado: {len(sc5)} cabecalhos")
    log(f"SC6 simulado: {len(sc6)} itens")
    log("Fim da demonstracao local")


if __name__ == "__main__":
    main()
