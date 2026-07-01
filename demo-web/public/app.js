const elements = {
  totalPedidos: document.querySelector("#totalPedidos"),
  pedidosImportados: document.querySelector("#pedidosImportados"),
  pedidosRejeitados: document.querySelector("#pedidosRejeitados"),
  itensRejeitados: document.querySelector("#itensRejeitados"),
  pedidosBody: document.querySelector("#pedidosBody"),
  sc5Body: document.querySelector("#sc5Body"),
  sc6Body: document.querySelector("#sc6Body"),
  logs: document.querySelector("#logs"),
  usarPadrao: document.querySelector("#usarPadrao"),
  processarUpload: document.querySelector("#processarUpload"),
  segunda: document.querySelector("#segunda"),
  limpar: document.querySelector("#limpar"),
  headerCsv: document.querySelector("#headerCsv"),
  itensCsv: document.querySelector("#itensCsv"),
};

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload && payload.error ? payload.error : `Falha na requisição: ${response.status}`);
  }
  return response.json();
}

function setLoading(isLoading) {
  elements.usarPadrao.disabled = isLoading;
  elements.processarUpload.disabled = isLoading;
  elements.segunda.disabled = isLoading;
  elements.limpar.disabled = isLoading;
}

async function run(action) {
  setLoading(true);
  try {
    const result = await action();
    render(result);
  } catch (error) {
    elements.logs.textContent = `[IMP_PEDIDOS_DEMO] ERRO | ${error.message}`;
  } finally {
    setLoading(false);
  }
}

function requestWithPayload(url, inputFiles) {
  const options = {
    method: "POST",
  };

  if (inputFiles) {
    options.headers = {
      "Content-Type": "application/json",
    };
    options.body = JSON.stringify(inputFiles);
  }

  return requestJson(url, options);
}

async function readSelectedCsvs() {
  const headerFile = elements.headerCsv.files[0];
  const itensFile = elements.itensCsv.files[0];

  if (!headerFile && !itensFile) {
    throw new Error("Selecione os dois arquivos para processar CSV manual.");
  }

  if (!headerFile || !itensFile) {
    throw new Error("Envie os dois arquivos: pedidos_header.csv e pedidos_itens.csv.");
  }

  return {
    headerCsv: await headerFile.text(),
    itensCsv: await itensFile.text(),
  };
}

function clearUploads() {
  elements.headerCsv.value = "";
  elements.itensCsv.value = "";
}

function render(result) {
  const summary = result.summary || {};
  elements.totalPedidos.textContent = summary.totalPedidos || 0;
  elements.pedidosImportados.textContent = summary.pedidosImportados || 0;
  elements.pedidosRejeitados.textContent = summary.pedidosRejeitados || 0;
  elements.itensRejeitados.textContent = summary.itensRejeitados || 0;

  renderRows(elements.pedidosBody, result.pedidos || [], (pedido) => [
    pedido.pedidoExterno,
    pedido.cliente,
    statusBadge(pedido.status),
    motivoCell(pedido),
    numberCell(pedido.itensValidos),
    numberCell(pedido.itensRejeitados),
  ]);

  renderRows(elements.sc5Body, result.sc5 || [], (row) => [
    row.pedidoInterno,
    row.pedidoExterno,
    row.cliente,
    row.origem,
    row.emissao,
  ]);

  renderRows(elements.sc6Body, result.sc6 || [], (row) => [
    row.pedidoInterno,
    row.item,
    row.produto,
    numberCell(row.quantidade),
    currencyCell(row.preco),
  ]);

  renderLogs(result.logs || []);
  elements.logs.scrollTop = elements.logs.scrollHeight;
}

function renderRows(tbody, rows, mapRow) {
  tbody.replaceChildren();

  if (rows.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.className = "empty";
    td.colSpan = 10;
    td.textContent = "Sem registros.";
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  for (const row of rows) {
    const tr = document.createElement("tr");
    for (const value of mapRow(row)) {
      const td = document.createElement("td");
      if (value instanceof Node) {
        td.appendChild(value);
      } else if (value && typeof value === "object") {
        td.textContent = String(value.text ?? "");
        if (value.className) {
          td.className = value.className;
        }
      } else {
        td.textContent = String(value ?? "");
      }
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
}

function statusBadge(status) {
  const span = document.createElement("span");
  span.className = `status ${status === "INCLUIDO" ? "ok" : "fail"}`;
  span.textContent = status === "INCLUIDO" ? "INCLUÍDO" : status;
  return span;
}

function motivoCell(pedido) {
  const motivo = pedido.motivo || "-";
  const hasItemAlert = pedido.status === "INCLUIDO" && Number(pedido.itensRejeitados) > 0;
  return {
    text: motivo,
    className: hasItemAlert ? "motivo-alerta" : "",
  };
}

function numberCell(value) {
  return {
    text: value,
    className: "numeric",
  };
}

function currencyCell(value) {
  return {
    text: `R$ ${value}`,
    className: "numeric",
  };
}

function renderLogs(logs) {
  elements.logs.replaceChildren();

  if (logs.length === 0) {
    const line = document.createElement("div");
    line.className = "log-line muted";
    line.textContent = "[IMP_PEDIDOS_DEMO] Aguardando processamento.";
    elements.logs.appendChild(line);
    return;
  }

  for (const entry of logs) {
    const line = document.createElement("div");
    line.className = `log-line ${logClass(entry)}`;
    line.textContent = entry;
    elements.logs.appendChild(line);
  }
}

function logClass(entry) {
  if (entry.includes("INCLUIDO")) return "success";
  if (entry.includes("REJEITADO") || entry.includes("REJEIÇÃO")) return "error";
  if (entry.includes("DIAGNOSTICO") || entry.includes("DIAGNÓSTICO")) return "diagnostic";
  if (entry.includes("Aviso") || entry.includes("CSV") || entry.includes("Base simulada")) return "muted";
  return "";
}

elements.usarPadrao.addEventListener("click", () => {
  clearUploads();
  run(() => requestJson("/api/process", { method: "POST" }));
});

elements.processarUpload.addEventListener("click", () => {
  run(async () => requestWithPayload("/api/process", await readSelectedCsvs()));
});

elements.segunda.addEventListener("click", () => {
  clearUploads();
  run(() => requestJson("/api/second-import", { method: "POST" }));
});

elements.limpar.addEventListener("click", () => {
  run(() => requestJson("/api/clear", { method: "POST" }));
});

run(() => requestJson("/api/state"));
