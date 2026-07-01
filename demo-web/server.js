const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(__dirname, "public");
const HEADER_CSV = path.join(ROOT_DIR, "data", "pedidos_header.csv");
const ITENS_CSV = path.join(ROOT_DIR, "data", "pedidos_itens.csv");
const PORT = Number(process.env.PORT || 3000);

const clientes = new Set(["01|000001|01", "01|000002|01"]);
const produtos = new Set(["01|PNEU1757013", "01|PNEU1856515", "01|SERVMONTAG"]);

const state = createEmptyState();

function createEmptyState() {
  return {
    pedidosImportados: new Set(),
    sc5: [],
    sc6: [],
    lastResult: emptyResult(),
  };
}

function emptyResult() {
  return {
    summary: {
      totalPedidos: 0,
      pedidosImportados: 0,
      pedidosRejeitados: 0,
      itensRejeitados: 0,
    },
    pedidos: [],
    sc5: [],
    sc6: [],
    logs: [
      "[IMP_PEDIDOS_DEMO] Aguardando processamento.",
      "[IMP_PEDIDOS_DEMO] Aviso: simulação visual da regra de negócio; não executa Protheus, AppServer, RPO ou MSExecAuto.",
    ],
  };
}

function resetState() {
  state.pedidosImportados = new Set();
  state.sc5 = [];
  state.sc6 = [];
  state.lastResult = emptyResult();
}

function normalizeKey(key) {
  return String(key || "").trim().toUpperCase();
}

function normalizePedido(value) {
  return String(value || "").trim().toUpperCase();
}

function parseDecimal(value) {
  const text = String(value || "").trim().replace(/\./g, ".").replace(",", ".");
  const number = Number(text);
  return Number.isFinite(number) ? number : 0;
}

function parseCsvContent(content, sourceName, logs) {
  const lines = content.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim() !== "");

  if (lines.length === 0) {
    throw new Error(`arquivo vazio: ${sourceName}`);
  }

  const headers = lines.shift().split(";").map(normalizeKey);
  const rows = lines.map((line) => {
    const values = line.split(";");
    return headers.reduce((row, header, index) => {
      row[header] = String(values[index] || "").trim();
      return row;
    }, {});
  });

  logs.push(`[IMP_PEDIDOS_DEMO] CSV lido: ${sourceName} | registros: ${rows.length}`);
  return rows;
}

function parseCsv(filePath, logs) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`arquivo não encontrado: ${path.relative(ROOT_DIR, filePath)}`);
  }

  return parseCsvContent(fs.readFileSync(filePath, "utf8"), path.relative(ROOT_DIR, filePath), logs);
}

function loadInput(logs, inputFiles = null) {
  const usingUploadedFiles = inputFiles && inputFiles.headerCsv && inputFiles.itensCsv;
  const headers = usingUploadedFiles
    ? parseCsvContent(inputFiles.headerCsv, "upload/pedidos_header.csv", logs)
    : parseCsv(HEADER_CSV, logs);
  const items = usingUploadedFiles
    ? parseCsvContent(inputFiles.itensCsv, "upload/pedidos_itens.csv", logs)
    : parseCsv(ITENS_CSV, logs);
  const groupedItems = new Map();

  for (const item of items) {
    const pedidoExterno = normalizePedido(item.PEDIDOEXTERNO);
    item.PEDIDOEXTERNO = pedidoExterno;
    item.ITEM = String(item.ITEM || "").padStart(3, "0");
    item.PRODUTO = String(item.PRODUTO || "").trim().toUpperCase();
    if (!groupedItems.has(pedidoExterno)) {
      groupedItems.set(pedidoExterno, []);
    }
    groupedItems.get(pedidoExterno).push(item);
  }

  logs.push(`[IMP_PEDIDOS_DEMO] Origem dos arquivos: ${usingUploadedFiles ? "CSV manual carregado pela tela" : "arquivos padrão do teste em data/"}`);
  logs.push(`[IMP_PEDIDOS_DEMO] Base simulada de clientes/SA1: ${clientes.size} registros`);
  logs.push(`[IMP_PEDIDOS_DEMO] Base simulada de produtos/SB1: ${produtos.size} registros`);
  return { headers, groupedItems };
}

function validateItem(filial, pedidoExterno, item, logs, options = {}) {
  const errors = [];
  const produto = item.PRODUTO || "";
  const quantidade = parseDecimal(item.QUANTIDADE);
  const preco = parseDecimal(item.PRECOUNIT);

  if (options.logValidation !== false) {
    logs.push(`[IMP_PEDIDOS_DEMO] VALIDAÇÃO PRODUTO ${pedidoExterno}/${item.ITEM} | ${produto || "<VAZIO>"}`);
  }

  if (!produto || !produtos.has(`${filial}|${produto}`)) {
    errors.push(`produto inválido: ${produto || "<VAZIO>"}`);
  }

  if (quantidade <= 0) {
    errors.push("quantidade inválida");
  }

  if (preco <= 0) {
    errors.push("preço inválido");
  }

  return { errors, quantidade, preco };
}

function processBatch(title, inputFiles = null) {
  const logs = [
    `[IMP_PEDIDOS_DEMO] ${title}`,
    "[IMP_PEDIDOS_DEMO] Aviso: simulação visual da regra de negócio; não executa Protheus.",
  ];
  const { headers, groupedItems } = loadInput(logs, inputFiles);
  const pedidos = [];
  let pedidosImportados = 0;
  let pedidosRejeitados = 0;
  let itensRejeitados = 0;

  for (const header of headers) {
    const pedidoExterno = normalizePedido(header.PEDIDOEXTERNO);
    const filial = String(header.FILIAL || "").trim();
    const cliente = String(header.CLIENTE || "").trim();
    const loja = String(header.LOJA || "").trim();
    const pedidoLogPrefix = `[IMP_PEDIDOS_DEMO] ${pedidoExterno || "<VAZIO>"}`;
    const items = groupedItems.get(pedidoExterno) || [];
    const validItems = [];
    const rejectedItems = [];

    logs.push(`${pedidoLogPrefix} | validação de cliente ${cliente}/${loja}`);

    if (!pedidoExterno) {
      pedidos.push(buildPedidoRow(header, "REJEITADO", "Pedido externo vazio", 0, items.length));
      pedidosRejeitados += 1;
      itensRejeitados += items.length;
      logs.push("[IMP_PEDIDOS_DEMO] REJEITADO Pedido sem PedidoExterno no cabeçalho");
      continue;
    }

    if (state.pedidosImportados.has(`${filial}|${pedidoExterno}`)) {
      pedidos.push(buildPedidoRow(header, "REJEITADO", "Duplicidade bloqueada por C5_XPEDEXT", 0, items.length));
      pedidosRejeitados += 1;
      itensRejeitados += items.length;
      logs.push(`[IMP_PEDIDOS_DEMO] REJEITADO ${pedidoExterno} | pedido já importado bloqueado por duplicidade em C5_XPEDEXT`);
      logs.push(`[IMP_PEDIDOS_DEMO] DIAGNÓSTICO ${pedidoExterno} | C5_XPEDEXT já existe na base simulada`);
      continue;
    }

    if (!clientes.has(`${filial}|${cliente}|${loja}`)) {
      pedidos.push(buildPedidoRow(header, "REJEITADO", "Cliente inexistente na base simulada/SA1", 0, items.length));
      pedidosRejeitados += 1;
      logs.push(`[IMP_PEDIDOS_DEMO] REJEITADO ${pedidoExterno} | cliente inexistente na base simulada/SA1`);

      for (const item of items) {
        const validation = validateItem(filial, pedidoExterno, item, logs, { logValidation: false });
        if (validation.errors.length > 0) {
          logs.push(`[IMP_PEDIDOS_DEMO] DIAGNOSTICO ITEM ${pedidoExterno}/${item.ITEM} | ${validation.errors.join(", ")}`);
        }
      }
      continue;
    }

    for (const item of items) {
      const validation = validateItem(filial, pedidoExterno, item, logs);
      if (validation.errors.length > 0) {
        rejectedItems.push(item);
        itensRejeitados += 1;
        logs.push(`[IMP_PEDIDOS_DEMO] REJEIÇÃO ITEM ${pedidoExterno}/${item.ITEM} | ${validation.errors.join(", ")}`);
      } else {
        validItems.push({ item, quantidade: validation.quantidade, preco: validation.preco });
      }
    }

    if (validItems.length === 0) {
      pedidos.push(buildPedidoRow(header, "REJEITADO", "Nenhum item válido para inclusão", 0, rejectedItems.length));
      pedidosRejeitados += 1;
      logs.push(`[IMP_PEDIDOS_DEMO] REJEITADO ${pedidoExterno} | nenhum item válido para inclusão`);
      continue;
    }

    const numeroPedido = `SIM${String(state.sc5.length + 1).padStart(6, "0")}`;
    state.sc5.push({
      pedidoInterno: numeroPedido,
      pedidoExterno,
      cliente,
      origem: header.ORIGEM || "ecommerce",
      emissao: header.EMISSAO || "",
    });

    for (const valid of validItems) {
      state.sc6.push({
        pedidoInterno: numeroPedido,
        item: valid.item.ITEM,
        produto: valid.item.PRODUTO,
        quantidade: formatNumber(valid.quantidade),
        preco: formatNumber(valid.preco),
      });
    }

    state.pedidosImportados.add(`${filial}|${pedidoExterno}`);
    pedidos.push(buildPedidoRow(header, "INCLUIDO", rejectedItems.length ? `Alerta: ${rejectedItems.length} item(ns) rejeitado(s)` : "", validItems.length, rejectedItems.length));
    pedidosImportados += 1;
    logs.push(`[IMP_PEDIDOS_DEMO] INCLUIDO ${pedidoExterno} | pedido simulado: ${numeroPedido} | itens válidos: ${validItems.length}`);
  }

  const result = {
    summary: {
      totalPedidos: headers.length,
      pedidosImportados,
      pedidosRejeitados,
      itensRejeitados,
    },
    pedidos,
    sc5: state.sc5,
    sc6: state.sc6,
    logs,
  };

  state.lastResult = result;
  return result;
}

function buildPedidoRow(header, status, motivo, itensValidos, itensRejeitados) {
  return {
    pedidoExterno: normalizePedido(header.PEDIDOEXTERNO),
    cliente: `${String(header.CLIENTE || "").trim()}/${String(header.LOJA || "").trim()}`,
    status,
    motivo,
    itensValidos,
    itensRejeitados,
  };
}

function formatNumber(value) {
  return Number(value).toFixed(2);
}

function sendJson(response, statusCode, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  });
  response.end(body);
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;

    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > 5 * 1024 * 1024) {
        reject(new Error("payload muito grande"));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });

    request.on("end", () => {
      const body = Buffer.concat(chunks).toString("utf8").trim();
      if (!body) {
        resolve(null);
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error("JSON inválido na requisição"));
      }
    });

    request.on("error", reject);
  });
}

async function getInputFiles(request) {
  const payload = await readJsonBody(request);
  if (!payload) {
    return null;
  }

  const hasHeader = typeof payload.headerCsv === "string" && payload.headerCsv.trim() !== "";
  const hasItens = typeof payload.itensCsv === "string" && payload.itensCsv.trim() !== "";

  if (hasHeader !== hasItens) {
    const missingFile = hasHeader ? "pedidos_itens.csv" : "pedidos_header.csv";
    const error = new Error(`envie os dois arquivos CSV para o processamento manual. Falta: ${missingFile}`);
    error.statusCode = 400;
    throw error;
  }

  return hasHeader && hasItens
    ? {
        headerCsv: payload.headerCsv,
        itensCsv: payload.itensCsv,
      }
    : null;
}

function serveStatic(request, response) {
  const urlPath = decodeURIComponent(new URL(request.url, `http://localhost:${PORT}`).pathname);
  const relativePath = urlPath === "/" ? "index.html" : urlPath.slice(1);
  const filePath = path.normalize(path.join(PUBLIC_DIR, relativePath));

  if (!filePath.startsWith(PUBLIC_DIR)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    response.writeHead(200, { "Content-Type": contentType(filePath) });
    response.end(content);
  });
}

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
  }[ext] || "application/octet-stream";
}

const server = http.createServer(async (request, response) => {
  try {
    if (request.method === "GET" && request.url === "/api/state") {
      sendJson(response, 200, state.lastResult);
      return;
    }

    if (request.method === "POST" && request.url === "/api/process") {
      resetState();
      const inputFiles = await getInputFiles(request);
      sendJson(response, 200, processBatch("Primeira importação simulada", inputFiles));
      return;
    }

    if (request.method === "POST" && request.url === "/api/second-import") {
      const inputFiles = await getInputFiles(request);
      const preparedFirstImport = state.pedidosImportados.size === 0;
      if (preparedFirstImport) {
        processBatch("Primeira importação simulada preparatória", inputFiles);
      }
      const result = processBatch("Segunda importação simulada para demonstrar duplicidade", inputFiles);
      if (preparedFirstImport) {
        result.logs.unshift("[IMP_PEDIDOS_DEMO] Primeira importação simulada executada automaticamente antes da segunda importação.");
      }
      sendJson(response, 200, result);
      return;
    }

    if (request.method === "POST" && request.url === "/api/clear") {
      resetState();
      sendJson(response, 200, state.lastResult);
      return;
    }

    if (request.method === "GET") {
      serveStatic(request, response);
      return;
    }

    response.writeHead(405);
    response.end("Method not allowed");
  } catch (error) {
    sendJson(response, error.statusCode || 500, { error: error.message });
  }
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log("Importador de Pedidos Protheus - Demo Local");
    console.log(`Servidor iniciado em http://localhost:${PORT}`);
    console.log("Pressione Ctrl+C para encerrar.");
  });
}

module.exports = {
  processBatch,
  resetState,
  server,
  state,
};
