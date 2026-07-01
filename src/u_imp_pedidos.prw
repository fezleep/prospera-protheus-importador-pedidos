#include "protheus.ch"

/*
    Importador simples de pedidos ecommerce para pedido de venda Protheus.
    Entrada:
      - data/pedidos_header.csv
      - data/pedidos_itens.csv

    Premissa: campos customizados C5_XPEDEXT e C5_XORIGEM criados no dicionario.
*/

User Function ImpPedidos()
    Local cArqCab  := "data/pedidos_header.csv"
    Local cArqItens:= "data/pedidos_itens.csv"
    Local aCab     := {}
    Local aItens   := {}
    Local aPedidos := {}
    Local nProc    := 0
    Local nIncl    := 0
    Local nRej     := 0
    Local nErro    := 0
    Local nI       := 0
    Local aRet     := {}

    ConOut("[IMP_PEDIDOS] Inicio da importacao")

    aCab   := ImpLeCsv(cArqCab)
    aItens := ImpLeCsv(cArqItens)

    If Len(aCab) == 0
        ConOut("[IMP_PEDIDOS] ERRO: nenhum cabecalho lido em " + cArqCab)
        Return
    EndIf

    If Len(aItens) == 0
        ConOut("[IMP_PEDIDOS] ERRO: nenhum item lido em " + cArqItens)
        Return
    EndIf

    aCab    := ImpNormalizaCab(aCab)
    aItens  := ImpNormalizaItens(aItens)
    aPedidos:= ImpAgrupaPedidos(aCab, aItens)

    For nI := 1 To Len(aPedidos)
        nProc++
        aRet := ImpProcessaPedido(aPedidos[nI])

        Do Case
        Case aRet[1] == "INCLUIDO"
            nIncl++
        Case aRet[1] == "ERRO"
            nErro++
        Otherwise
            nRej++
        EndCase
    Next

    ConOut("[IMP_PEDIDOS] Resumo final")
    ConOut("[IMP_PEDIDOS] Processados: " + AllTrim(Str(nProc)))
    ConOut("[IMP_PEDIDOS] Incluidos: " + AllTrim(Str(nIncl)))
    ConOut("[IMP_PEDIDOS] Rejeitados: " + AllTrim(Str(nRej)))
    ConOut("[IMP_PEDIDOS] Erros: " + AllTrim(Str(nErro)))
    ConOut("[IMP_PEDIDOS] Fim da importacao")
Return

Static Function ImpLeCsv(cArquivo)
    Local cConteudo := ""
    Local aLinhas   := {}
    Local aHeader   := {}
    Local aDados    := {}
    Local aCampos   := {}
    Local hLinha    := Nil
    Local nLinha    := 0
    Local nCol      := 0
    Local cLinha    := ""

    If !File(cArquivo)
        ConOut("[IMP_PEDIDOS] ERRO: arquivo nao encontrado: " + cArquivo)
        Return {}
    EndIf

    cConteudo := MemoRead(cArquivo)
    cConteudo := ImpDecodeUtf8(cConteudo)
    cConteudo := StrTran(cConteudo, Chr(13), "")
    aLinhas   := ImpSplit(cConteudo, Chr(10))

    For nLinha := 1 To Len(aLinhas)
        cLinha := AllTrim(aLinhas[nLinha])

        If Empty(cLinha)
            Loop
        EndIf

        aCampos := ImpParseCsvLinha(cLinha)

        If Len(aHeader) == 0
            aHeader := aCampos
            Loop
        EndIf

        hLinha := JsonObject():New()

        For nCol := 1 To Len(aHeader)
            hLinha[Upper(AllTrim(aHeader[nCol]))] := Iif(nCol <= Len(aCampos), AllTrim(aCampos[nCol]), "")
        Next

        AAdd(aDados, hLinha)
    Next

    ConOut("[IMP_PEDIDOS] CSV lido: " + cArquivo + " | registros: " + AllTrim(Str(Len(aDados))))
Return aDados

Static Function ImpDecodeUtf8(cTexto)
    Local cRet := cTexto

    // Alguns ambientes ja entregam o texto no encoding correto.
    Begin Sequence
        cRet := DecodeUtf8(cTexto)
    Recover
        cRet := cTexto
    End Sequence
Return cRet

Static Function ImpParseCsvLinha(cLinha)
    Local aRet    := {}
    Local cCampo  := ""
    Local lAspas  := .F.
    Local nPos    := 0
    Local cChar   := ""
    Local cProx   := ""

    For nPos := 1 To Len(cLinha)
        cChar := SubStr(cLinha, nPos, 1)
        cProx := Iif(nPos < Len(cLinha), SubStr(cLinha, nPos + 1, 1), "")

        Do Case
        Case cChar == '"' .And. lAspas .And. cProx == '"'
            cCampo += '"'
            nPos++
        Case cChar == '"'
            lAspas := !lAspas
        Case cChar == ";" .And. !lAspas
            AAdd(aRet, cCampo)
            cCampo := ""
        Otherwise
            cCampo += cChar
        EndCase
    Next

    AAdd(aRet, cCampo)
Return aRet

Static Function ImpSplit(cTexto, cSep)
    Local aRet := {}
    Local nIni := 1
    Local nPos := 0

    While .T.
        nPos := At(cSep, SubStr(cTexto, nIni))

        If nPos == 0
            AAdd(aRet, SubStr(cTexto, nIni))
            Exit
        EndIf

        AAdd(aRet, SubStr(cTexto, nIni, nPos - 1))
        nIni += nPos
    EndDo
Return aRet

Static Function ImpNormalizaCab(aCab)
    Local nI := 0
    Local h  := Nil

    For nI := 1 To Len(aCab)
        h := aCab[nI]
        h["PEDIDOEXTERNO"] := Upper(AllTrim(ImpGet(h, "PEDIDOEXTERNO")))
        h["FILIAL"]        := AllTrim(ImpGet(h, "FILIAL"))
        h["CLIENTE"]       := AllTrim(ImpGet(h, "CLIENTE"))
        h["LOJA"]          := AllTrim(ImpGet(h, "LOJA"))
        h["CONDPAG"]       := AllTrim(ImpGet(h, "CONDPAG"))
        h["TABELAPRECO"]   := AllTrim(ImpGet(h, "TABELAPRECO"))
        h["VENDEDOR"]      := AllTrim(ImpGet(h, "VENDEDOR"))
        h["ORIGEM"]        := Lower(AllTrim(Iif(Empty(ImpGet(h, "ORIGEM")), "ecommerce", ImpGet(h, "ORIGEM"))))
    Next
Return aCab

Static Function ImpNormalizaItens(aItens)
    Local nI := 0
    Local h  := Nil

    For nI := 1 To Len(aItens)
        h := aItens[nI]
        h["PEDIDOEXTERNO"] := Upper(AllTrim(ImpGet(h, "PEDIDOEXTERNO")))
        h["ITEM"]          := PadL(AllTrim(ImpGet(h, "ITEM")), 2, "0")
        h["PRODUTO"]       := Upper(AllTrim(ImpGet(h, "PRODUTO")))
        h["QUANTIDADE"]    := ImpVal(ImpGet(h, "QUANTIDADE"))
        h["PRECOUNIT"]     := ImpVal(ImpGet(h, "PRECOUNIT"))
        h["DESCONTOPERC"]  := ImpVal(Iif(Empty(ImpGet(h, "DESCONTOPERC")), "0", ImpGet(h, "DESCONTOPERC")))
    Next
Return aItens

Static Function ImpAgrupaPedidos(aCab, aItens)
    Local aPedidos := {}
    Local nCab     := 0
    Local nItem    := 0
    Local hPedido  := Nil
    Local cPedExt  := ""

    For nCab := 1 To Len(aCab)
        cPedExt := ImpGet(aCab[nCab], "PEDIDOEXTERNO")
        hPedido := JsonObject():New()
        hPedido["CAB"]   := aCab[nCab]
        hPedido["ITENS"] := {}

        For nItem := 1 To Len(aItens)
            If ImpGet(aItens[nItem], "PEDIDOEXTERNO") == cPedExt
                AAdd(hPedido["ITENS"], aItens[nItem])
            EndIf
        Next

        AAdd(aPedidos, hPedido)
    Next
Return aPedidos

Static Function ImpProcessaPedido(hPedido)
    Local hCab        := hPedido["CAB"]
    Local aItens      := hPedido["ITENS"]
    Local aItensValid := {}
    Local aErros      := {}
    Local cPedExt     := ImpGet(hCab, "PEDIDOEXTERNO")
    Local cMotDup     := ""
    Local nI          := 0
    Local aAuto       := {}
    Local aRet        := {}
    Local lClienteOk  := .T.

    ConOut("[IMP_PEDIDOS] Pedido externo: " + cPedExt)

    If Empty(cPedExt)
        ImpLogRej("Pedido sem PedidoExterno no cabecalho")
        Return {"REJEITADO", "Pedido externo vazio"}
    EndIf

    lClienteOk := ImpClienteValido(ImpGet(hCab, "FILIAL"), ImpGet(hCab, "CLIENTE"), ImpGet(hCab, "LOJA"))

    If ImpJaImportado(ImpGet(hCab, "FILIAL"), cPedExt, @cMotDup)
        ImpLogRej(cPedExt + " | " + cMotDup)
        Return {"REJEITADO", cMotDup}
    EndIf

    If !lClienteOk
        ImpLogRej(cPedExt + " | cliente inexistente em SA1: " + ImpGet(hCab, "CLIENTE") + "/" + ImpGet(hCab, "LOJA"))

        For nI := 1 To Len(aItens)
            aErros := ImpValidaItem(ImpGet(hCab, "FILIAL"), aItens[nI])

            If Len(aErros) > 0
                ConOut("[IMP_PEDIDOS] DIAGNOSTICO ITEM " + cPedExt + "/" + ImpGet(aItens[nI], "ITEM") + " | " + ImpJoin(aErros, ", "))
            EndIf
        Next

        Return {"REJEITADO", "Cliente inexistente em SA1"}
    EndIf

    For nI := 1 To Len(aItens)
        aErros := ImpValidaItem(ImpGet(hCab, "FILIAL"), aItens[nI])

        If Len(aErros) == 0
            AAdd(aItensValid, aItens[nI])
        Else
            ConOut("[IMP_PEDIDOS] REJEICAO ITEM " + cPedExt + "/" + ImpGet(aItens[nI], "ITEM") + " | " + ImpJoin(aErros, ", "))
        EndIf
    Next

    If Len(aItensValid) == 0
        ImpLogRej(cPedExt + " | nenhum item valido para inclusao")
        Return {"REJEITADO", "Sem item valido"}
    EndIf

    aAuto := ImpMontaAuto(hCab, aItensValid)
    aRet  := ImpIncluiPedido(cPedExt, aAuto[1], aAuto[2])
Return aRet

Static Function ImpValidaItem(cFilial, hItem)
    Local aErros := {}

    If Empty(ImpGet(hItem, "PRODUTO")) .Or. !ImpProdutoValido(cFilial, ImpGet(hItem, "PRODUTO"))
        AAdd(aErros, "produto invalido: " + ImpGet(hItem, "PRODUTO"))
    EndIf

    If ImpGet(hItem, "QUANTIDADE") <= 0
        AAdd(aErros, "quantidade menor ou igual a zero")
    EndIf

    If ImpGet(hItem, "PRECOUNIT") <= 0
        AAdd(aErros, "preco menor ou igual a zero")
    EndIf
Return aErros

Static Function ImpClienteValido(cFilial, cCliente, cLoja)
    Local lOk := .F.
    Local aArea := GetArea()

    DbSelectArea("SA1")
    SA1->(DbSetOrder(1))
    lOk := SA1->(DbSeek(cFilial + cCliente + cLoja))

    RestArea(aArea)
Return lOk

Static Function ImpProdutoValido(cFilial, cProduto)
    Local lOk := .F.
    Local aArea := GetArea()

    DbSelectArea("SB1")
    SB1->(DbSetOrder(1))
    lOk := SB1->(DbSeek(cFilial + cProduto))

    RestArea(aArea)
Return lOk

Static Function ImpJaImportado(cFilial, cPedExt, cMotivo)
    Local lExiste := .F.
    Local aArea   := GetArea()
    Local nCampo  := 0

    DbSelectArea("SC5")
    nCampo := SC5->(FieldPos("C5_XPEDEXT"))

    If nCampo == 0
        cMotivo := "campo C5_XPEDEXT nao existe em SC5"
        ConOut("[IMP_PEDIDOS] ERRO: " + cMotivo)
        RestArea(aArea)
        Return .T.
    EndIf

    SC5->(DbGoTop())

    While !SC5->(Eof())
        If SC5->C5_FILIAL == cFilial .And. AllTrim(SC5->(FieldGet(nCampo))) == cPedExt .And. !SC5->(Deleted())
            lExiste := .T.
            cMotivo := "duplicidade em SC5.C5_XPEDEXT"
            Exit
        EndIf

        SC5->(DbSkip())
    EndDo

    RestArea(aArea)
Return lExiste

Static Function ImpMontaAuto(hCab, aItens)
    Local aCabAuto   := {}
    Local aItensAuto := {}
    Local aItemAuto  := {}
    Local nI         := 0

    aCabAuto := { ;
        {"C5_FILIAL",  ImpGet(hCab, "FILIAL"),        Nil}, ;
        {"C5_EMISSAO", ImpData(ImpGet(hCab, "EMISSAO")), Nil}, ;
        {"C5_CLIENTE", ImpGet(hCab, "CLIENTE"),       Nil}, ;
        {"C5_LOJACLI", ImpGet(hCab, "LOJA"),          Nil}, ;
        {"C5_CONDPAG", ImpGet(hCab, "CONDPAG"),       Nil}, ;
        {"C5_TABELA",  ImpGet(hCab, "TABELAPRECO"),   Nil}, ;
        {"C5_VEND1",   ImpGet(hCab, "VENDEDOR"),      Nil}, ;
        {"C5_XPEDEXT", ImpGet(hCab, "PEDIDOEXTERNO"), Nil}, ;
        {"C5_XORIGEM", ImpGet(hCab, "ORIGEM"),        Nil}, ;
        {"C5_MENNOTA", ImpGet(hCab, "OBS"),           Nil}  ;
    }

    For nI := 1 To Len(aItens)
        aItemAuto := { ;
            {"C6_ITEM",    ImpGet(aItens[nI], "ITEM"),         Nil}, ;
            {"C6_PRODUTO", ImpGet(aItens[nI], "PRODUTO"),      Nil}, ;
            {"C6_QTDVEN",  ImpGet(aItens[nI], "QUANTIDADE"),   Nil}, ;
            {"C6_PRCVEN",  ImpGet(aItens[nI], "PRECOUNIT"),    Nil}, ;
            {"C6_DESCONT", ImpGet(aItens[nI], "DESCONTOPERC"), Nil}  ;
        }

        AAdd(aItensAuto, aItemAuto)
    Next
Return {aCabAuto, aItensAuto}

Static Function ImpIncluiPedido(cPedExt, aCabAuto, aItensAuto)
    Local lOk := .F.
    Local cErro := ""
    Private lMsErroAuto := .F.
    Private lMsHelpAuto := .T.
    Private lAutoErrNoFile := .T.

    Begin Sequence
        // Opcao 3 e usual para inclusao no MSExecAuto da MATA410.
        // Confirmar a assinatura no release do cliente antes da execucao produtiva.
        MSExecAuto({|x, y, z| MATA410(x, y, z)}, aCabAuto, aItensAuto, 3)
    Recover Using oErr
        cErro := oErr:Description
        lMsErroAuto := .T.
    End Sequence

    If lMsErroAuto
        If Empty(cErro)
            cErro := ImpAutoErro()
        EndIf

        ConOut("[IMP_PEDIDOS] ERRO " + cPedExt + " | falha MSExecAuto/MATA410 | " + cErro)
        Return {"ERRO", cErro}
    EndIf

    lOk := .T.
    ConOut("[IMP_PEDIDOS] INCLUIDO " + cPedExt + " | itens validos: " + AllTrim(Str(Len(aItensAuto))))
Return Iif(lOk, {"INCLUIDO", ""}, {"ERRO", "Falha nao identificada"})

Static Function ImpAutoErro()
    Local aAutoLog := {}
    Local cErro    := ""
    Local nI       := 0

    Begin Sequence
        aAutoLog := GetAutoGRLog()

        For nI := 1 To Len(aAutoLog)
            cErro += Iif(Empty(cErro), "", " | ") + AllTrim(aAutoLog[nI])
        Next
    Recover
        cErro := "Erro nao retornado pelo GetAutoGRLog"
    End Sequence
Return cErro

Static Function ImpGet(hObj, cCampo)
    Local uRet := ""
    Local cKey := Upper(cCampo)

    If ValType(hObj[cKey]) <> "U"
        uRet := hObj[cKey]
    EndIf
Return uRet

Static Function ImpVal(cValor)
    Local cNum := AllTrim(cValToChar(cValor))

    If "," $ cNum
        cNum := StrTran(cNum, ".", "")
        cNum := StrTran(cNum, ",", ".")
    EndIf
Return Val(cNum)

Static Function ImpData(cData)
    Local cRet := AllTrim(cData)

    If Len(cRet) == 10 .And. SubStr(cRet, 3, 1) == "/" .And. SubStr(cRet, 6, 1) == "/"
        Return StoD(SubStr(cRet, 7, 4) + SubStr(cRet, 4, 2) + SubStr(cRet, 1, 2))
    EndIf
Return Date()

Static Function ImpJoin(aTexto, cSep)
    Local cRet := ""
    Local nI   := 0

    For nI := 1 To Len(aTexto)
        cRet += Iif(Empty(cRet), "", cSep) + aTexto[nI]
    Next
Return cRet

Static Function ImpLogRej(cMsg)
    ConOut("[IMP_PEDIDOS] REJEITADO " + cMsg)
Return
